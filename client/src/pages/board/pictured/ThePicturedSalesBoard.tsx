import { theZoneDatesAreIn } from '@/lib/a-date-reads-the-same-everywhere'
import { ItsEvidence } from '@/components/gw/ItsEvidence'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { toast } from 'sonner'
import { MessageCircle } from 'lucide-react'
import { Section, Panel, Tag, Button, EdgeList, EdgeRow } from '@/components/gw/ui'
import { checkInLinksApi } from '@/api/check-in-links'
import { useAskStore } from '@/stores/ask'
import { whenTheBoardLastChanged } from '../when-the-board-last-changed'
import { TheDealsCanBeChanged, WhatShowsItBlock } from '../WorkRecords'
import './pictured-board.css'
import { useTheDirectMorning } from '@/lib/the-direct-morning'
import { TheNudgeButton } from './TheNudgeButton'

/**
 * THE SALES BOARD AS PICTURED, FOR WHOEVER RUNS IT (screen match, 16 October; the target is
 * docs/prototype/screens/B5-the-board/board-as-lead.jpg and its .txt, section by section, in the
 * picture's order). "Build each screen as pictured" (Hafsah, 15 October): this replaces, for the
 * lead of a sales check-in only, the folded "light" layout and the long list of extra sections the
 * board had grown. Nothing here decides who may read what: every line is drawn from the board the
 * server already served to this reader, after every wall (board.service.ts). A section the server
 * sent nothing for says so in a sentence, never an empty heading.
 *
 * The words that are the product's own (headings, notes, buttons, tags) are the picture's. The
 * lines that come from the record (names, deals, sentences the engine writes) are the record's.
 */

type Any = any // the served board is typed loosely in api/board.ts for most of these sections

export interface PicturedBoardProps {
  b: Any
  groundId: string
  sessionRows: Any[]
  /** The engine's own action buttons for one item under "What needs you" (BoardPage's ActionButtons). */
  renderActions: (action: Any) => ReactNode
  /** "Over time", drawn by the board page (it owns the chart and its toggle). */
  overTime: ReactNode
  recommendations: { id: string; says: string; question?: string | null; yes: string; no: string }[]
  onAnswerRecommendation: (offerId: string, yes: boolean) => void
  recommendationBusy: boolean
  onRecordTheDecision: () => void
  navigate: (to: string) => void
  /** What kind of work this is, and the lead's way to change it (KindOfWorkBanner): kept, at the foot, since the picture has no place for it. */
  kindOfWork?: ReactNode
  /** The record's other sections that hold something (a forecast from another system), drawn as the board always drew them. */
  otherRecords?: ReactNode
  /** The lead's person-by-person part (YourTeamPersonByPerson), drawn after the team today rather than above the board. */
  yourTeam?: ReactNode
  /** An admin who only reads (read-only-view.jpg): the same board, with nothing to press that only whoever runs it may do. */
  readOnly?: boolean
}

/**
 * HOW OFTEN, IN THE PICTURE'S WORDS ("Daily on weekdays, from 4pm."): the cadence, the days it runs and the
 * hour the latest session opened, in this reader's own time. Null where the cadence is not known.
 */
export function theScheduleInWords(cadence: string | null | undefined, workingDays: number[] | null | undefined, opensAt: string | null | undefined, anchorDay: number | null = null): string | null {
  const days = [...new Set(workingDays ?? [])].sort().join(',')
  const when = opensAt ? new Date(opensAt) : null
  const hour = when && !Number.isNaN(when.getTime())
    ? new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).format(when).replace(':00', '').replace(/\s/g, '').toLowerCase()
    : null
  const from = hour ? `, from ${hour}` : ''
  if (cadence === 'DAILY') return days === '1,2,3,4,5' ? `Daily on weekdays${from}.` : `Every day${from}.`
  const day = anchorDay != null ? ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][anchorDay] : null
  if (cadence === 'WEEKLY') return day ? `Weekly, ${day}.` : `Weekly${from}.`
  if (cadence === 'FORTNIGHTLY') return day ? `Every two weeks, ${day}.` : `Every two weeks${from}.`
  if (cadence === 'MONTHLY') return `Monthly${from}.`
  return null
}

/** "23 Sep", as the picture writes a day: never "23 Sept". */
export function aShortDay(at: string | Date): string {
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return ''
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric' }).format(d)
  const month = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(d).slice(0, 3)
  return `${day} ${month}`
}

const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || ''
/* Only a detail kept as the deal's value (the server's theValueOf), never another detail standing in for one ("Kevin, Paul"). */
const A_VALUE_KEY = /^(?:deal\s+)?(?:value|amount|worth|size)$/i
function aValueKeptWithIt(fields: Record<string, string> | null | undefined): string | null {
  for (const [k, v] of Object.entries(fields ?? {})) if (A_VALUE_KEY.test(k.trim()) && String(v ?? '').trim()) return String(v).trim()
  return null
}

/** The kit's words for a deal with no next step on record (sales-board.txt, "Nothing booked"). */
export const NOTHING_BOOKED = 'Nothing booked'

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const inWords = (n: number) => (n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n))

/** Groups of deals, by the server's own `group` on each row. */
export function dealsByGroup(section: Any): Record<string, Any[]> {
  const out: Record<string, Any[]> = {}
  for (const r of section?.rows ?? []) {
    if (r.kind !== 'deal') continue
    ;(out[r.group ?? 'possible'] ??= []).push(r)
  }
  return out
}

/* ------------------------------------------------------------------ the headline, and the gap */

/**
 * "21 sold, 17 with proof of payment", the numbers in bold, from the engine's count of the deals on record. Where a signed order
 * proves some of it (Hafsah: a signed order or a payment both count as won with proof, and payment is counted apart; quality pass,
 * 18 October, B-3): "65 sold. 40 paid, 25 on a signed order."
 */
export function soldAndProven(c: { counts: string; sold: number; proven: number | null; shown?: number | null; currency?: string | null }): ReactNode {
  const n = (v: number) => `${c.counts === 'value' && c.currency ? `${c.currency} ` : ''}${Number(v).toLocaleString('en-GB')}`
  if ((c.shown ?? 0) > 0) return <><b>{n(c.sold)}</b> sold. <b>{n(c.proven ?? 0)}</b> paid, <b>{n(c.shown ?? 0)}</b> on a signed order.</>
  return <><b>{n(c.sold)}</b> sold, <b>{n(c.proven ?? 0)}</b> with proof of payment</>
}

export function HeadlineAndGap({ b, deals, groups }: { b: Any; deals: Any; groups: Record<string, Any[]> }) {
  const headline = b.headline
  const aim = (b.objectives ?? []).find((o: Any) => !o.ownerParticipantId && o.target != null) ?? null
  const likely = (groups.likely ?? []).length
  const possible = groups.possible ?? []
  const nextQuarter = (groups['next-quarter'] ?? []).length
  const coolingOrCold = (groups.cooling ?? []).length + (groups.cold ?? []).length
  const done = aim?.count ?? null
  const target = aim?.target ?? null
  const gapAfterLikely = target != null && done != null ? Math.max(0, target - done - likely) : null
  const pct = (n: number) => (target ? Math.max(0, Math.min(100, (100 * n) / target)) : 0)
  /*
   * THE SERVER COUNTS THE GAP BY WHAT EACH DEAL HOLDS (Drop Access, 17 October): "To close the gap, all seven of these" was said
   * of 55 units over seven deals holding 13 between them. Where the server sent its own heading, that is the one read, with its
   * sentence under it where the deals hold units or value; where it sent none, the deals are counted one each, as before.
   */
  const served = b.toCloseTheGap ?? null
  const countsEachDealAsOne = !aim?.fromTheDeals || !['units', 'value'].includes(aim.fromTheDeals.counts)
  const gapHeading: string | null = served && served.heading !== undefined
    ? served.heading
    : gapAfterLikely != null && gapAfterLikely > 0 && possible.length > 0
      ? (gapAfterLikely >= possible.length ? `To close the gap, all ${inWords(possible.length)} of these` : `To close the gap, ${inWords(gapAfterLikely)} of these ${inWords(possible.length)}`)
      : null
  const gapSays: string | null = served && !countsEachDealAsOne ? served.says : null
  if (!headline && !aim) return null
  return (
    <div className="pb-head">
      <div>
        {headline?.question && <p className="pb-q">{headline.question}</p>}
        {headline?.answer && <p className="pb-answer">{headline.answer}</p>}
        {target != null && done != null && (
          <div className="pb-bar" role="img" aria-label={`${done} of ${target} done, ${likely} more likely.`}>
            <span className="pb-bar-done" style={{ width: `${pct(done)}%` }} />
            <span className="pb-bar-likely" style={{ width: `${pct(Math.min(likely, target - done))}%` }} />
          </div>
        )}
        {deals && (
          <>
            <div className="pb-tiles">
              {/* Counted from the deals on record, the picture's "21 sold, 17 with proof of payment" (Hafsah, 17 October). */}
              {done != null && (aim?.fromTheDeals && aim.fromTheDeals.counts !== 'new leads'
                ? <span>{soldAndProven(aim.fromTheDeals)}</span>
                : <span><b>{done}</b> {aim?.name && /sale/i.test(aim.name) ? 'sold' : 'done'}</span>)}
              <span><b>{likely}</b> likely</span>
              <span><b>{possible.length}</b> possible</span>
            </div>
            <div className="pb-tiles pb-tiles-2">
              <span><b>{nextQuarter}</b> next quarter, <b>{coolingOrCold}</b> cooling or cold</span>
              {/* One question, one target: new leads are their own line (quality pass, 18 October, B-1). */}
              {((headline?.besides ?? []) as Any[]).map((x: Any) => <span key={x.objectiveId}>{x.says}</span>)}
            </div>
            <p className="pb-note">No chance-to-close percentages yet. They need a quarter of this team’s own results.</p>
          </>
        )}
      </div>
      {deals && gapHeading && possible.length > 0 && (
        <Panel>
          <h2 className="pb-gap-h">{gapHeading}</h2>
          {gapSays && <p className="pb-note">{gapSays}</p>}
          {possible.map((d: Any) => (
            <div className="pb-gap-row" key={d.id}>
              <div className="pb-gap-row-top">
                <span className="pb-gap-name">{d.name}</span>
                <span className="pb-gap-who">{firstName(d.owner)}</span>
              </div>
              {/* The kit's "Nothing booked" where no next step is on record (Release 1's sales board; Hafsah's point 4, 17 October). */}
              <div className={d.next || d.nextStep ? 'pb-gap-next' : 'pb-gap-next pb-gap-next-none'}>{d.nextStep ?? d.next ?? (b.releaseOneSalesBoard ? NOTHING_BOOKED : d.nextSays)}</div>
            </div>
          ))}
        </Panel>
      )}
    </div>
  )
}

export function WhatTheTargetAssumes({ b }: { b: Any }) {
  const rows = (b.objectives ?? []).filter((o: Any) => !o.ownerParticipantId && o.target != null && (o.assumes ?? []).length > 0)
  if (!rows.length) return null
  return (
    <>
      {rows.map((o: Any) => (
        <Panel key={o.id}>
          <h2 className="pb-panel-h">{`What the target of ${Number(o.target).toLocaleString('en-GB')} assumes`}</h2>
          <ul className="pb-bullets">
            {o.assumes.map((a: string) => <li key={a}>{a}</li>)}
          </ul>
          <p className="gwui-panel-text">If one of these stops being true, the target needs a second look.</p>
        </Panel>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ what needs you */

/**
 * SOMEBODY STILL FOLLOWING UP WHAT THE STALL RULE SAYS TO DROP, as the board read before Release 1's sales board (board-as-lead.txt:
 * "Samuel has chased the same 5 leads for 3 check-ins. The stall rule you set says drop them."). Kept for an organisation that has
 * Release 1's board switched off, so switching it off returns the board it had (release plan, Part 0). From the deals the board
 * serves: a stalled deal whose owner kept speaking about it after the customer stopped answering.
 */
export function stillChasing(deals: Any[]): { participantId: string; first: string; deals: number; checkIns: number }[] {
  const by = new Map<string, { first: string; deals: number; checkIns: number }>()
  for (const d of deals) {
    if (d.group !== 'cold' || !d.notAnsweringSince || !d.ownerParticipantId) continue
    const after = (d.contactHistory ?? []).filter((c: Any) => c.on >= d.notAnsweringSince).length
    if (after < 2) continue
    const had = by.get(d.ownerParticipantId) ?? { first: firstName(d.owner), deals: 0, checkIns: 0 }
    by.set(d.ownerParticipantId, { first: had.first, deals: had.deals + 1, checkIns: Math.max(had.checkIns, after) })
  }
  return [...by.entries()].map(([participantId, v]) => ({ participantId, ...v }))
}

export function WhatNeedsYou({ b, renderActions, groundId, deals, sessionRows, manyInTeams = false, heading = 'What needs you in this check-in', readOnly = false }: { b: Any; renderActions: (a: Any) => ReactNode; groundId: string; deals: Any; sessionRows: Any[]; manyInTeams?: boolean; heading?: string; readOnly?: boolean }) {
  const items: { key: string; kind: 'decide' | 'look'; title: string; detail?: string; action?: Any; node?: ReactNode }[] = []
  const qc = useQueryClient()
  const { data: sharing } = useQuery({ queryKey: ['report-sharing', groundId], queryFn: () => reportsApi.sharing(groundId), enabled: !readOnly && !!groundId, retry: false, staleTime: 30_000 })
  const afterSharing = () => { qc.invalidateQueries({ queryKey: ['report-sharing', groundId] }); qc.invalidateQueries({ queryKey: ['board', groundId] }); qc.invalidateQueries({ queryKey: ['report', groundId] }) }
  const shareNow = useMutation({ mutationFn: () => reportsApi.release(groundId), onSuccess: afterSharing, onError: (e: Any) => toast.error(e?.response?.data?.message ?? 'Today’s report was not shared. Try again.') })
  const holdIt = useMutation({ mutationFn: () => reportsApi.hold(groundId), onSuccess: afterSharing, onError: (e: Any) => toast.error(e?.response?.data?.message ?? 'Today’s report was not held. Try again.') })
  /* Today's team report, written and not shared yet: the lead shares it (the Report tab is where it is released). */
  const today = sessionRows[0]
  /* Only whoever runs it shares the team's report; an admin who only reads is not told to. */
  /*
   * A report shares itself at its set time unless the lead holds it (Hafsah's answers 1 and 5, 16 October 2026), as pictured:
   * "Today’s report shares itself at 6:30pm. Read it first if you like, or share it now." with "Share now" and "Hold it".
   * The words are the server's, from when this check-in's report really shares itself.
   */
  if (!readOnly && today && !today.shared && today.answered > 0) {
    const says = (sharing?.says ?? 'Today’s report is ready to share.').replace(/\.$/, '')
    items.push({
      key: 'share-today', kind: 'look', title: says,
      detail: sharing?.held ? 'Share it when you are ready.' : 'Read it first if you like, or share it now.',
      node: (
        <span className="pb-own-team-actions">
          <Button kind="secondary" size="small" onClick={() => shareNow.mutate()} disabled={shareNow.isPending}>Share now</Button>
          {!sharing?.held && sharing?.at && <Button kind="secondary" size="small" onClick={() => holdIt.mutate()} disabled={holdIt.isPending}>Hold it</Button>}
        </span>
      ),
    })
  }
  /*
   * A wait on the lead that a yes or a no answers, as the prototype's decision: the question, who asked and when, and
   * "Yes, agree to it" and "No", which keep the answer and clear the wait (board-as-lead.txt). The server sends it to the lead alone.
   */
  for (const a of (b.leadActions ?? []) as Any[]) {
    if (!a?.decision?.question || !(a.action?.choices ?? []).length) continue
    items.push({ key: `d-wait-${a.id}`, kind: 'decide', title: a.decision.question, detail: a.decision.why ?? undefined, action: a.action })
  }
  /*
   * Each deal at the stall rule, with whose it is (board-as-lead.txt: "The stall rule you set says drop them.", "Ask him"),
   * as the server words it for the lead alone, after every wall. The person is named, never "he" or "she".
   */
  for (const s of (b.atTheStallRule ?? []) as Any[]) {
    items.push({
      key: `stalled-${s.participantId}`, kind: 'look', title: s.title, detail: s.detail,
      node: <Button kind="secondary" size="small" to={`/grounds/${groundId}?tab=context`}>{s.ask}</Button>,
    })
  }
  /*
   * Release 1's sales board switched off for this organisation: the item the board had before it (stillChasing). Only where the
   * server says so: it says it to whoever runs the check-in and to an admin, and never to a person who checks in, whose own
   * board is cut to their own work (a-participants-board-is-their-own), so they read none of it.
   */
  if (b.releaseOneSalesBoard === false) {
    for (const c of stillChasing((deals?.rows ?? []).filter((r: Any) => r.kind === 'deal'))) {
      items.push({
        key: `chasing-${c.participantId}`, kind: 'look',
        title: `${c.first} has followed up ${c.deals === 1 ? 'a lead' : `the same ${c.deals} leads`} with no reply for ${c.checkIns} check-ins`,
        detail: `The stall rule says drop ${c.deals === 1 ? 'it' : 'them'}. Nothing on record says why ${c.first} is still following ${c.deals === 1 ? 'it' : 'them'} up.`,
        node: <Button kind="secondary" size="small" to={`/grounds/${groundId}?tab=context`}>{`Ask ${c.first}`}</Button>,
      })
    }
  }
  for (const [i, d] of (b.decisions ?? []).entries()) {
    /* A wait is drawn once, as its own card under "Blockers" (what-needs-you-does-not-repeat-a-blocker). */
    if (d.source === 'blocker') continue
    /* A difference between people is followed under "Open issues" when that list is served. */
    if (d.source === 'divergence' && (b.openIssues?.issues ?? []).length) continue
    items.push({ key: `d-${i}`, kind: d.action?.choices?.length ? 'decide' : 'look', title: d.question, detail: d.why ?? undefined, action: d.action })
  }
  for (const m of b.missedCheckIns ?? []) items.push({ key: `m-${m.participantId}`, kind: 'look', title: m.text })
  if (manyInTeams) {
    /*
     * salesorg-board.jpg: on a large team the lead reads, here, what keeps coming up about each person's work
     * (from the patterns the lead is already served, after each person's own turn) and the people not yet told
     * a target the lead set (from the lead's own actions), each with a way to open it.
     */
    for (const x of (b.patterns ?? []).filter((x: Any) => !x.yours && x.whatHappened && x.participantId)) {
      const who = firstName((b.participants ?? []).find((q: Any) => q.id === x.participantId)?.name)
      if (!who) continue
      items.push({
        key: `p-${x.id}`, kind: 'look', title: `${who}: ${String(x.whatHappened).charAt(0).toLowerCase()}${String(x.whatHappened).slice(1).replace(/\.$/, '')}`,
        detail: 'This keeps coming up, three check-ins in a row.',
        node: <Button kind="secondary" size="small" to={`/grounds/${groundId}/person/${x.participantId}`}>Open</Button>,
      })
    }
    const untold = (b.leadActions ?? []).filter((a: Any) => String(a.id ?? '').startsWith('tell-'))
    if (untold.length) {
      const names = untold.map((a: Any) => firstName((b.participants ?? []).find((q: Any) => `tell-${q.id}` === a.id || String(a.id).endsWith(q.id))?.name ?? String(a.says ?? '').replace(/^You need to talk (.+?) through.*$/, '$1'))).filter(Boolean)
      const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
      items.push({
        key: 'untold', kind: 'look', title: untold.length === 1 ? `${list} has not been told their target` : `${untold.length} people have not been told their target`,
        detail: untold.length === 1 ? 'This comes from the targets.' : `They are ${list}. This comes from the targets.`,
        node: <Button kind="secondary" size="small" to={`/grounds/${groundId}`}>Open</Button>,
      })
    }
  }
  if (!items.length) return null
  /* The lead's own decisions first, as pictured; then the report, then what the work shows. */
  items.sort((a, c) => Number(!a.key.startsWith('d-')) - Number(!c.key.startsWith('d-')))
  return (
    <Section heading={heading}>
      <EdgeList label={heading}>
        {items.map((it) => (
          <EdgeRow key={it.key} kind={it.kind} title={it.title} detail={it.detail} actions={readOnly ? undefined : (it.node ?? (it.action ? renderActions(it.action) : undefined))} />
        ))}
      </EdgeList>
    </Section>
  )
}

/* ------------------------------------------------------------------ every deal, day by day */

const DAY = 86_400_000
export const isoDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: theZoneDatesAreIn(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

/** Weekdays from the Monday four weeks before this one to the Friday of next week: six weeks, thirty days. */
function theSixWeeks(now: Date): { days: string[]; mondays: string[] } {
  const today = new Date(`${isoDay(now)}T12:00:00Z`)
  const dow = (today.getUTCDay() + 6) % 7
  const monday = new Date(today.getTime() - dow * DAY - 28 * DAY)
  const days: string[] = []
  const mondays: string[] = []
  for (let w = 0; w < 6; w += 1) {
    for (let d = 0; d < 5; d += 1) {
      const at = new Date(monday.getTime() + (w * 7 + d) * DAY)
      days.push(at.toISOString().slice(0, 10))
      if (d === 0) mondays.push(at.toISOString().slice(0, 10))
    }
  }
  return { days, mondays }
}

function lastContactIn(r: Any, today: string): string {
  /* A customer gone quiet reads "no reply since", from the last day somebody heard from them (standing decision 4, 18 October). */
  if (r.notAnsweringSince && (r.group === 'cold' || r.noReplySince)) return `no reply since ${aShortDay(r.noReplySince ?? r.notAnsweringSince)}`
  const on = r.lastSaidOn
  if (!on) return ''
  const days = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${on}T12:00:00Z`)) / DAY)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function TheDays({ r, days, today }: { r: Any; days: string[]; today: string }) {
  const how = new Map<string, string>()
  for (const c of r.contactHistory ?? []) how.set(c.on, /proof/i.test(c.how ?? '') ? 'proof' : 'said')
  const silentFrom = (r.group === 'cold' || r.noReplySince) && r.notAnsweringSince ? r.notAnsweringSince : null
  return (
    <div className="pb-days" aria-label={`${r.name}, the last six weeks`}>
      {days.map((d) => {
        /* The day the next step is booked for, ahead of today or on it (the kit's "Next step booked"). */
        if (r.nextOn === d && d >= today && r.group !== 'cold') return <span key={d}><span className="pb-dot pb-dot-next" /></span>
        if (d > today) return <span key={d} />
        const h = how.get(d)
        /* After the customer stopped answering, a day somebody spoke about it is a follow-up with no reply. */
        const cls = silentFrom && d >= silentFrom && h ? 'pb-dot-noreply' : h === 'proof' ? 'pb-dot-proof' : h === 'said' ? 'pb-dot-said' : 'pb-dot-none'
        return <span key={d}><span className={`pb-dot ${cls}${d === today ? ' pb-dot-today' : ''}`} /></span>
      })}
    </div>
  )
}

export function EveryDealDayByDay({ b, section, now, groundId, heading = 'Every deal, day by day', note = 'Grouped by what the proof says about closing this quarter', ownTag = null }: { b: Any; section: Any; now: Date; groundId: string; heading?: string; note?: string; ownTag?: string | null }) {
  /* The direct morning (lib/the-direct-morning.tsx): no note that explains the board or says who sees what. */
  const direct = useTheDirectMorning()
  const rows: Any[] = (section?.rows ?? []).filter((r: Any) => r.kind === 'deal')
  const [openId, setOpenId] = useState<string | null>(null)
  const { days, mondays } = useMemo(() => theSixWeeks(now), [now])
  const today = isoDay(now)
  if (!section) return null
  const byId = new Map(rows.map((r) => [r.id, r]))
  /* The first deal as the grid draws it is open to begin with, as pictured. */
  const firstShown = (section.groups ?? []).flatMap((g: Any) => g.rowIds ?? []).map((id: string) => byId.get(id)).find(Boolean)
  const open = (openId && byId.get(openId)) || firstShown || rows[0] || null
  const lost: Any[] = Array.isArray(section.lost) ? section.lost : []
  return (
    <>
    <Section heading={heading} note={direct && note === 'Only yours' ? undefined : note}>
      {/* Each line of the key only where a row on the grid carries that mark (board review, sales piece D, item 3). */}
      <div className="pb-legend">
        {rows.some((r) => r.mark === 'proven' || (r.contactHistory ?? []).some((c: Any) => /proof/i.test(c.how ?? ''))) && <span><span className="pb-dot pb-dot-proof" />Contact with proof: a photo, a quote, a payment</span>}
        {rows.some((r) => r.mark === 'said' || (r.contactHistory ?? []).some((c: Any) => !/proof/i.test(c.how ?? ''))) && <span><span className="pb-dot pb-dot-said" />Contact in their words</span>}
        {/* The kit's "Next step booked", where a row's next step has its day on the grid (quality pass, 18 October, B-11). */}
        {rows.some((r) => r.nextOn && r.nextOn >= today && r.group !== 'cold') && <span><span className="pb-dot pb-dot-next" />Next step booked</span>}
        {rows.some((r) => (r.group === 'cold' || r.noReplySince) && r.notAnsweringSince) && <span><span className="pb-dot pb-dot-noreply" />Follow-up, no reply</span>}
      </div>
      <TheDealsCanBeChanged groundId={groundId} section={section} participants={(b.participants ?? []).map((x: Any) => ({ id: x.id, name: x.name }))} canEdit={!!b.canEditFrame}>
      {(api) => (<>
      {rows.length === 0 ? (
        <p className="gwui-panel-text">{lost.length
          ? 'No deal is open now. The deals that were lost are listed under Lost deals, and why.'
          : 'No deal is on record yet. A deal appears here once somebody names a customer in a check-in, or one is added here.'}</p>
      ) : (
        <div className="pb-grid">
          <table>
            <thead>
              <tr>
                <th>Deal</th>
                <th>Stage now</th>
                <th>Last contact</th>
                {mondays.map((m) => <th key={m} className="pb-week">{aShortDay(`${m}T12:00:00Z`)}</th>)}
                <th>Next step</th>
              </tr>
            </thead>
            <tbody>
              {!(section.groups ?? []).length && <GroupRows g={{ group: 'all', heading: null, reason: null, rowIds: rows.map((r) => r.id) }} byId={byId} openId={open?.id ?? null} onOpen={setOpenId} days={days} today={today} api={api} claims={!ownTag && !!b.canEditFrame} releaseOne={!!b.releaseOneSalesBoard} />}
              {(section.groups ?? []).map((g: Any) => (
                <GroupRows key={g.group} g={g} byId={byId} openId={open?.id ?? null} onOpen={setOpenId} days={days} today={today} api={api} claims={!ownTag && !!b.canEditFrame} releaseOne={!!b.releaseOneSalesBoard} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!direct && <p className="pb-below">Something here wrong? Anyone can correct what’s about their own work in their check-in; the change and the original both show here.</p>}
      {open && <TheOpenDeal r={open} groupNote={(section.groups ?? []).find((g: Any) => g.rowIds?.includes(open.id))} today={today} groundId={groundId} onChange={b.canEditFrame ? () => api.edit(open) : null} ownTag={ownTag} />}
      </>)}
      </TheDealsCanBeChanged>
    </Section>
    <LostDeals lost={lost} myParticipantId={b.myParticipantId ?? null} />
    </>
  )
}

/*
 * LOST DEALS, AND WHY (Hafsah, 18 October: a Lost stage; the prototype's board-part-2-sales-team.txt). One row per lost deal, as
 * the server serves it to this reader (a rep is sent only their own): the deal, whose it is, the day, the reason in the rep's own
 * words, what shows that reason, and what it teaches, only where the record supports a lesson. A lost deal is never a row in the
 * open grid above, and no open total counts it.
 */
export const LOST_NOTE = 'A reason with no source stays unverified. An unknown reason is flagged, because it can’t be learned from.'
export const NO_LESSON_ON_RECORD = 'Nothing on record teaches anything from it yet.'
export const NO_REASON_GIVEN_YET = 'Nobody has said why yet.'

export function LostDeals({ lost, myParticipantId }: { lost: Any[]; myParticipantId: string | null }) {
  /* The direct morning (lib/the-direct-morning.tsx): no note that explains the board or says who sees what. */
  const direct = useTheDirectMorning()
  if (!lost.length) return null
  return (
    <Section heading="Lost deals, and why" note={direct ? undefined : LOST_NOTE}>
      <div className="pb-grid pb-lost">
        <table>
          <thead>
            <tr>
              <th>What</th>
              <th>Owner</th>
              <th>When</th>
              <th>Reason</th>
              <th>Reason from</th>
              <th>What it teaches</th>
            </tr>
          </thead>
          <tbody>
            {lost.map((l: Any) => (
              <tr key={l.id} className={l.reason ? 'pb-lost-row' : 'pb-lost-row pb-lost-unknown'}>
                <td className="pb-deal-name">{l.name}</td>
                <td>{l.ownerParticipantId && l.ownerParticipantId === myParticipantId ? 'You' : (firstName(l.owner) || 'Nobody is named for it yet.')}</td>
                <td>{aShortDay(`${l.on}T12:00:00Z`)}</td>
                <td>{l.reason ?? NO_REASON_GIVEN_YET}</td>
                <td>{l.reasonFrom}</td>
                <td>{l.lesson ?? NO_LESSON_ON_RECORD}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

/*
 * THE KIT'S SIX STAGES, AND NO OTHER (Hafsah's point 7, 17 October). With Release 1's sales board on, the server puts a deal spoken of
 * at Contacted; only a deal added here that nobody has contacted is left with no stage, and it says so.
 */
export const NOT_CONTACTED_YET = 'Not contacted yet.'

function GroupRows({ g, byId, openId, onOpen, days, today, api, claims, releaseOne = false }: { g: Any; byId: Map<string, Any>; openId: string | null; onOpen: (id: string) => void; days: string[]; today: string; api: { claim: (row: Any, yes: boolean) => void; claimPending: boolean }; claims: boolean; releaseOne?: boolean }) {
  const rows = (g.rowIds ?? []).map((id: string) => byId.get(id)).filter(Boolean)
  /* A lost deal is never in a group: it is listed under "Lost deals, and why" (LostDeals). */
  if (!rows.length) return null
  const heading = g.group === 'cold' ? 'Cold' : g.heading
  return (
    <>
      {heading && <tr className="pb-group"><td colSpan={10}><b>{heading}</b>{g.reason}</td></tr>}
      {rows.map((r: Any) => (
        <tr key={r.id} className={`pb-deal${r.id === openId ? ' pb-on' : ''}`} onClick={() => onOpen(r.id)} aria-selected={r.id === openId}>
          <td>
            <div className="pb-deal-name">{r.name}</div>
            <div className="pb-deal-sub">{[firstName(r.owner) || 'Nobody is named for it yet.', r.valueLine ?? ('value' in r ? r.value : aValueKeptWithIt(r.fields))].filter(Boolean).join(', ')}</div>
          </td>
          <td><span className="pb-stage"><span className={`pb-dot ${r.mark === 'proven' ? 'pb-dot-proof' : 'pb-dot-said'}`} />{r.stage ? <span className="gwui-tag gwui-tag-plain pb-stage-word">{r.stage}</span> : releaseOne ? NOT_CONTACTED_YET : 'No stage said yet.'}</span></td>
          <td className="pb-last">{lastContactIn(r, today)}</td>
          <td colSpan={6}><TheDays r={r} days={days} today={today} /></td>
          <td className={r.group === 'cold' ? 'pb-next pb-next-stall' : r.next ? 'pb-next' : 'pb-next pb-next-none'}>
            {r.group === 'cold' ? 'Stall rule reached' : r.nextStep ?? r.next ?? NOTHING_BOOKED}
            {/* Somebody says this deal is theirs: the lead's yes makes it so (decision 76, item 3). */}
            {claims && r.ownerClaim && (
              <div className="pb-claim" onClick={(e) => e.stopPropagation()}>
                <span>{r.ownerClaim.says}</span>
                <span className="pb-issue-acts">
                  <Button kind="secondary" size="small" disabled={api.claimPending} onClick={() => api.claim(r, true)}>Yes</Button>
                  <Button kind="secondary" size="small" disabled={api.claimPending} onClick={() => api.claim(r, false)}>No</Button>
                </span>
              </div>
            )}
          </td>
        </tr>
      ))}
    </>
  )
}

const PROOF_TAG: Record<string, string> = { proven: 'Proven', confirmed: 'Confirmed', said: 'In their words', memory: 'From memory', none: 'Added here' }

export function TheOpenDeal({ r, groupNote, today, groundId, onChange, ownTag = null }: { r: Any; groupNote: Any; today: string; groundId: string; onChange: (() => void) | null; ownTag?: string | null }) {
  return (
    <div className="pb-detail">
      <Panel>
        <div className="pb-detail-top">
          <span className="pb-detail-name">{r.name}</span>
          {(r.valueLine ?? r.value) && <span>{r.valueLine ?? r.value}</span>}
        </div>
        <div className="pb-detail-who">
          {/* On a person's own board, the deal is named as theirs, said to them as "you" like "Your read, in your words" below it (Drop Access short run, item 14: "Mercy’s account" beside "Your read"). */}
          {ownTag ? <Tag tone="attention">{ownTag}</Tag> : <Tag tone={r.mark === 'proven' ? 'proven' : 'plain'}>{PROOF_TAG[r.mark ?? 'said'] ?? 'In their words'}</Tag>}
          <span>{ownTag
            ? (lastContactIn(r, today) ? `Your last contact was ${lastContactIn(r, today)}.` : '')
            : [firstName(r.owner), lastContactIn(r, today) ? `last contact ${lastContactIn(r, today)}` : null].filter(Boolean).join(', ')}</span>
        </div>
        {(r.groupSays ?? groupNote?.reason) && <div className="pb-why"><b>Why it’s here.</b> {r.groupSays ?? groupNote?.reason}</div>}
        {/*
          * The four criteria, ticked as the kit ticks them ("✓ Need", "✓ Budget the customer stated", "✓ Decision maker",
          * "✓ Buying date"), from the server's own reading of the record (Release 1's sales board). Unticked while not on record.
          */}
        {Array.isArray(r.criteria) && r.criteria.length > 0 && (
          <ul className="pb-crit" aria-label="The four criteria">
            {r.criteria.map((c: Any) => (
              <li key={c.criterion} className={c.met ? undefined : 'pb-miss'}>
                {c.met ? '✓' : '○'} {c.label}{c.met && c.value ? `, ${c.value}` : ''}{!c.met && c.says ? `. ${c.says}` : ''}
              </li>
            ))}
          </ul>
        )}
        {/* What shows it, in the record's own words, where the third panel does not already quote them. */}
        {(r.from === 'lead' || !r.theirRead?.words) && <WhatShowsItBlock row={r} leadFirstName={null} readerIsLead={!ownTag} />}
        <div className="pb-nextbox" style={{ marginTop: 12 }}><b>Next:</b> {r.nextStep ?? r.next ?? NOTHING_BOOKED}</div>
        {/* A customer's reply is on its deal, not under Blockers (Hafsah, 17 October): the engine's own sentence for each wait. */}
        {(r.waitingOnTheCustomer ?? []).map((w: Any) => <p className="gwui-panel-text" key={w.id} style={{ marginTop: 8 }}>{w.says}</p>)}
        {onChange && <div style={{ marginTop: 8 }}><Button kind="quiet" size="small" onClick={onChange}>Change</Button></div>}
      </Panel>
      <Panel>
        <h3 className="pb-small-h">Contact history</h3>
        {(r.contactHistory ?? []).length ? (
          <ul className="pb-hist">
            {r.contactHistory.slice(0, 5).map((c: Any) => (
              <li key={c.on}>
                <span>{aShortDay(`${c.on}T12:00:00Z`)}</span>
                <span><span className={`pb-dot ${/proof/i.test(c.how ?? '') ? 'pb-dot-proof' : 'pb-dot-said'}`} />{/proof/i.test(c.how ?? '') ? 'With proof' : 'In their words'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="gwui-panel-text">Nobody has spoken about it in a check-in yet.</p>
        )}
      </Panel>
      {/* Release 1B: the proof filed on this deal, beside it (served only while the switch is on). */}
      {(r.evidence ?? []).length > 0 && <Panel><ItsEvidence evidence={r.evidence} /></Panel>}
      {r.theirRead?.words && (
        <Panel>
          <h3 className="pb-small-h">{r.theirRead.who === 'You' ? 'Your read, in your words' : `${firstName(r.theirRead.who)}’s read, in their words`}</h3>
          <p className="pb-read">“{r.theirRead.words}”</p>
          <div style={{ textAlign: 'center' }}>
            <Button kind="quiet" to={`/grounds/${groundId}`}>Not right? Tell the check-in</Button>
          </div>
        </Panel>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ the team today */

const TEAM_TAG: Record<string, { word: string; tone: 'proven' | 'attention' | 'plain' }> = {
  'has not answered': { word: 'Not in yet', tone: 'plain' },
  'nothing to do': { word: 'Nothing needs you', tone: 'proven' },
  'waiting on someone': { word: 'Waiting on someone', tone: 'attention' },
  'something in the way two weeks': { word: 'Stuck two weeks', tone: 'attention' },
  'behind the pace': { word: 'Behind the pace', tone: 'attention' },
  'nothing checkable': { word: 'Nothing checkable yet', tone: 'attention' },
  'not let in': { word: 'Not let in', tone: 'plain' },
}

function lastTen(b: Any, participantId: string): ('done' | 'miss' | 'up')[] {
  const grid = b.checkInGrid
  if (!grid) return []
  const row = (grid.rows ?? []).find((r: Any) => r.participantId === participantId)
  if (!row) return []
  const sessions: number[] = (grid.sessions ?? []).slice(-10)
  return sessions.map((n) => (row.cells?.[String(n)] === 'done' ? 'done' : row.cells?.[String(n)] === 'upcoming' ? 'up' : 'miss'))
}

/**
 * ONE SHORT TAG FOR WHAT EACH PERSON'S WORK SHOWS (board-as-lead.txt: "Deals moving", "Same leads, no
 * replies", "Not in yet"), from what the record says about their deals and today's session, never a
 * word about the person. Where none of these applies, the reason the server gave for the row.
 */
export function aTagForTheWork(reason: string, deals: Any[], today: string, workTag?: string | null): { word: string; tone: 'proven' | 'attention' | 'plain' } | null {
  if (reason === 'has not answered') return TEAM_TAG[reason]
  const week = Date.parse(`${today}T12:00:00Z`) - 7 * DAY
  const moving = deals.some((d) => (d.contactHistory ?? []).some((c: Any) => /proof/i.test(c.how ?? '') && Date.parse(`${c.on}T12:00:00Z`) >= week))
  if (moving) return { word: 'Deals moving', tone: 'proven' }
  /* "Many visits, few moves", "Visits without names": the server's tag from a pattern about the work (a-short-tag-for-the-work.ts). */
  if (workTag) return { word: workTag, tone: 'attention' }
  if (deals.length && deals.every((d) => d.group === 'cold')) return { word: 'Same leads, no replies', tone: 'attention' }
  return TEAM_TAG[reason] ?? null
}

export function TheTeamToday({ b, deals: dealSection, today, groundId }: { b: Any; deals: Any; today: string; groundId: string }) {
  /* The direct morning (lib/the-direct-morning.tsx): no note that explains the board or says who sees what. */
  const direct = useTheDirectMorning()
  const rows: Any[] = b.eachPersonToday ?? []
  const dealsOf = (pid: string) => (dealSection?.rows ?? []).filter((d: Any) => d.kind === 'deal' && d.ownerParticipantId === pid)
  if (!rows.length) return null
  /* What keeps coming up about this person's work, from the patterns this reader is served. */
  const theirWorkPattern = (pid: string): string | null => {
    const p = (b.patterns ?? []).find((x: Any) => x.participantId === pid && x.about !== 'what is said against what happened' && x.whatHappened)
    return p ? String(p.whatHappened).replace(/\.$/, '') : null
  }
  const reasonOf = new Map<string, string>((b.eachPerson ?? []).map((p: Any) => [p.participantId, p.reason]))
  return (
    <Section heading="The team today" note="Each person’s line, their last 10 check-ins, and what keeps coming up">
      <div className="pb-rows">
        {rows.map((r) => {
          /*
           * ABOUT TODAY (Hafsah's point 10): where the server says whether they checked in today, "Not in yet" is for somebody who
           * has not, never for somebody who did and whose next session has opened since.
           */
          const served = String(reasonOf.get(r.participantId) ?? '')
          const reason = r.checkedInToday === false ? 'has not answered' : r.checkedInToday === true && served === 'has not answered' ? '' : served
          /* On a day the check-in does not run, the day they were last in (quality pass, 18 October, B-21). */
          const tag = r.lastIn ? { word: `Last in ${r.lastIn}`, tone: 'plain' as const } : aTagForTheWork(reason, dealsOf(r.participantId), today, r.workTag)
          return (
            <div className="pb-row pb-row-team" key={r.participantId}>
              <Link className="pb-row-name pb-name-link" to={`/grounds/${groundId}/person/${r.participantId}`}>{firstName(r.who)}</Link>
              <span>{r.line}</span>
              <span>{tag && <Tag tone={tag.tone}>{tag.word}</Tag>}</span>
              <span className="pb-squares" aria-label={`${firstName(r.who)}, the last 10 check-ins`}>
                {lastTen(b, r.participantId).map((s, i) => <span key={i} className={`pb-sq${s === 'miss' ? ' pb-sq-miss' : s === 'up' ? ' pb-sq-up' : ''}`} />)}
              </span>
              {/* What keeps coming up, then what to coach this week, about the work (quality pass, 18 October, Q6). */}
              <span className="pb-sub">{[r.keepsComingUp ?? theirWorkPattern(r.participantId), r.thisWeek].filter(Boolean).join(' ')}</span>
              {/* "Nudge Peter": served to the lead alone, with the direct morning on (TheNudgeButton.tsx). */}
              {r.nudge && <span className="pb-row-nudge"><TheNudgeButton groundId={groundId} nudge={r.nudge} /></span>}
            </div>
          )
        })}
      </div>
      <p className="pb-foot">{direct ? 'Open anyone to see what they said and what the proof shows.' : 'These are about the work. Open anyone to see what they said and what the proof shows.'}</p>
    </Section>
  )
}

/* ------------------------------------------------------------------ blockers */

const BLOCKER_TAG: Record<string, { word: string; tone: 'concern' | 'attention' | 'action' }> = {
  blocking: { word: 'Blocking', tone: 'concern' },
  waiting: { word: 'Waiting', tone: 'attention' },
  decision: { word: 'Decision', tone: 'action' },
}

export function Blockers({ b, groundId }: { b: Any; groundId: string }) {
  const { data: links } = useQuery({ queryKey: ['check-in-links', groundId], queryFn: () => checkInLinksApi.get(groundId), staleTime: 30_000, retry: false })
  /* A wait on another team is drawn under "Waiting on other teams", once. */
  const elsewhere = new Set(((links as Any)?.waitingOnOtherTeams ?? []).map((w: Any) => w.id))
  const rows: Any[] = (b.blockers ?? []).filter((x: Any) => x.state !== 'cleared' && !elsewhere.has(x.id))
  if (!rows.length) return null
  const leadId = b.myParticipantId
  return (
    <Section heading="Blockers" note="Each with its history and the one thing that would clear it">
      <div className="pb-cards">
        {rows.map((x) => {
          const isADecision = !!leadId && x.onParticipantId === leadId
          const tag = BLOCKER_TAG[isADecision ? 'decision' : x.state] ?? BLOCKER_TAG.waiting
          const on = isADecision ? 'You' : (x.on ?? x.onLabel ?? (x.says?.match(/waiting on (.+?) for /)?.[1]) ?? null)
          return (
            <div className="pb-card" key={x.id}>
              <div className="pb-card-top">
                <h3 className="pb-card-h">{x.name ? x.name.charAt(0).toUpperCase() + x.name.slice(1) : x.says}</h3>
                <Tag tone={tag.tone}>{tag.word}</Tag>
              </div>
              <div className="pb-facts">
                {on && <span><span className="pb-l">Waiting on:</span> {on}</span>}
                {x.raised && <span><span className="pb-l">Raised:</span> {x.raised.says}</span>}
                {x.holdingUp && <span><span className="pb-l">Affects:</span> {x.holdingUp}</span>}
                {x.timeGiven && !/^No time has been given/.test(x.timeGiven) && <span className="pb-wide"><span className="pb-l">Promised:</span> {x.timeGiven}</span>}
                {/* What was tried, as a full sentence; the kit has no "Tried:" label (quality pass, 18 October, Q4). */}
                {x.tried && <span className="pb-wide">{x.tried}</span>}
                {x.proof?.says && <span className="pb-wide"><span className="pb-l">What the proof shows:</span> {x.proof.says}</span>}
              </div>
              <div className="pb-clear"><b>Would clear it:</b> {x.wouldClearIt ?? x.wouldClearItSays}</div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ what keeps coming up */

export function WhatKeepsComingUp({ b }: { b: Any }) {
  /* The direct morning (lib/the-direct-morning.tsx): no note that explains the board or says who sees what. */
  const direct = useTheDirectMorning()
  /* A promise carried over three check-ins running is about the work too (standing decision 5, as changed on 18 October). */
  const carried: Any[] = (b.keepsComingUp ?? []).map((x: Any, i: number) => ({ id: `carried-${i}`, participantId: x.participantId, yours: x.yours, about: 'the work', whatHappened: x.says }))
  const all: Any[] = [...(b.patterns ?? []), ...carried]
  const nameOf = new Map<string, string>((b.participants ?? []).map((p: Any) => [p.id, firstName(p.name)]))
  const aboutTheWork = all.filter((p) => p.about !== 'what is said against what happened')
  const aboutWhatIsSaid = all.filter((p) => p.about === 'what is said against what happened')
  const byHeading = new Map<string, Any[]>()
  for (const p of aboutWhatIsSaid) byHeading.set(p.heading, [...(byHeading.get(p.heading) ?? []), p])
  return (
    <Section heading="What keeps coming up" note={direct ? undefined : 'Named after three check-ins in a row, never after one. Each describes the work'}>
      {all.length === 0 ? (
        <Panel><p className="gwui-panel-text">{direct ? 'Nothing has come up three check-ins in a row yet.' : 'Nothing has come up three check-ins in a row yet. When something does, it shows here, and the person it is about sees it first.'}</p></Panel>
      ) : (
        <div className="pb-two">
          <Panel>
            <h3 className="pb-small-h">About each person’s work</h3>
            {aboutTheWork.map((p) => (
              <div className="pb-kv" key={p.id}>
                <b>{p.yours ? 'You' : nameOf.get(p.participantId) ?? ''}</b>
                <span>{p.whatHappened ?? p.heading}</span>
              </div>
            ))}
            {!aboutTheWork.length && <p className="gwui-panel-text">Nothing about anybody’s work yet.</p>}
          </Panel>
          <Panel>
            <h3 className="pb-small-h">How what people say can run ahead of what happened</h3>
            {[...byHeading.entries()].map(([heading, ps]) => (
              <div className="pb-kind" key={heading}>
                <b>{heading}</b>
                <span>{ps[0].whatHappened ?? ''} <i>{ps.map((p) => (p.yours ? 'You' : nameOf.get(p.participantId) ?? '')).join(', ')}</i></span>
              </div>
            ))}
            {!byHeading.size && <p className="gwui-panel-text">Nothing yet.</p>}
          </Panel>
        </div>
      )}
      {!direct && <p className="pb-foot">Each person sees what’s about them, and can answer it in their own words.</p>}
    </Section>
  )
}

/* ------------------------------------------------------------------ reported vs criteria met */

export function ReportedAgainstCriteria({ b, heading = 'Reported vs criteria met, stage by stage' }: { b: Any; heading?: string }) {
  const data = b.reportedAgainstCriteria
  const stages: Any[] = data?.stages ?? []
  if (!data) return null
  const most = Math.max(1, ...stages.map((s) => s.reported ?? 0))
  /* Only where the record says what each stage needs does the board say what "meets the criteria". */
  const criteriaKnown = stages.some((s) => s.met != null)
  return (
    <Section heading={heading} note="The shape of the work">
      <Panel>
        {stages.length ? (
          <div className="pb-bars">
            {stages.map((s) => (
              <FragmentRow key={s.stage}>
                <span>{s.stage}</span>
                <span className="pb-hbar" aria-label={s.says}>
                  <span className="pb-out" style={{ width: `${(100 * (s.reported ?? 0)) / most}%` }} />
                  <span className="pb-in" style={{ width: `calc(${(100 * (s.lost ? (s.withAReason ?? 0) : (s.met ?? s.withProof ?? 0))) / most}% - 8px)` }} />
                </span>
                <span>{s.lost ? `${s.reported} lost, ${s.withAReason ?? 0} with a reason` : s.met != null ? (s.reported == null ? `${s.met} met` : `${s.reported} said, ${s.met} met`) : `${s.reported} said, ${s.withProof} with proof`}</span>
              </FragmentRow>
            ))}
          </div>
        ) : (
          <p className="gwui-panel-text">{data.says ?? data.why}</p>
        )}
        {criteriaKnown
          ? <p className="pb-foot">Outlined: what people reported. Filled: what meets the criteria.</p>
          : <p className="pb-foot">Outlined: what people reported. Filled: what has proof behind it.</p>}
      </Panel>
      {criteriaKnown
        ? <p className="pb-foot">Dashed: what reps reported. Solid: criteria met (for Won, a signed order or a payment record).</p>
        : data.why && <p className="pb-foot">{data.why}</p>}
    </Section>
  )
}
function FragmentRow({ children }: { children: ReactNode }) { return <>{children}</> }

/* ------------------------------------------------------------------ who checked in */

export function WhoCheckedIn({ b }: { b: Any }) {
  const rows: Any[] = (b.checkInGrid?.rows ?? []).filter((r: Any) => !r.managingOnly)
  if (!rows.length) return null
  return (
    <Section heading="Who checked in" note="The last 10 sessions, one row each">
      <div className="pb-who-grid">
        {rows.map((r) => (
          <FragmentRow key={r.participantId}>
            <span>{r.participantId === b.myParticipantId ? 'You' : firstName(r.name)}</span>
            <span className="pb-squares">
              {lastTen(b, r.participantId).map((s, i) => <span key={i} className={`pb-sq2${s === 'done' ? '' : ' pb-sq-miss'}`} aria-label={s === 'done' ? 'Checked in' : s === 'up' ? 'Not open yet' : 'Missed'} />)}
            </span>
          </FragmentRow>
        ))}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ reports */

const sameDay = (a: string | Date, b: string | Date) => isoDay(new Date(a)) === isoDay(new Date(b))

/** ISO week number, as "Week 39". */
function weekNumberOf(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = (t.getUTCDay() + 6) % 7
  t.setUTCDate(t.getUTCDate() - day + 3)
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4))
  return 1 + Math.round(((t.getTime() - firstThursday.getTime()) / DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
}

/**
 * The weekday the week's report is complete on: the day of this week's last session, or, while the
 * schedule ahead is not drawn yet, the day last week's last session fell on (a weekday check-in's
 * week ends on Friday).
 */
function theLastSessionThisWeek(b: Any, now: Date): string | null {
  const monday = new Date(`${isoDay(now)}T12:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  const opens: Date[] = (b.phaseSpine?.sessions ?? []).map((s: Any) => s.opensOn ?? s.date).filter(Boolean).map((d: string) => new Date(d))
  const within = (from: Date) => opens.filter((d) => d.getTime() >= from.getTime() - 12 * 3600_000 && d.getTime() < from.getTime() + 7 * DAY - 12 * 3600_000).sort((a, c) => a.getTime() - c.getTime())
  const thisWeek = within(monday)
  const lastWeek = within(new Date(monday.getTime() - 7 * DAY))
  const pick = thisWeek.length && thisWeek[thisWeek.length - 1] > now ? thisWeek[thisWeek.length - 1] : lastWeek[lastWeek.length - 1]
  return pick ? new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(pick) : null
}

export function Reports({ b, groundId, sessionRows, navigate, now }: { b: Any; groundId: string; sessionRows: Any[]; navigate: (to: string) => void; now: Date }) {
  /* The direct morning (lib/the-direct-morning.tsx): no note that explains the board or says who sees what. */
  const direct = useTheDirectMorning()
  if (!sessionRows.length) return null
  const yesterday = new Date(now.getTime() - DAY)
  const titleOf = (r: Any) => {
    if (!r.opened) return `Session ${r.sessionNumber}`
    const day = aShortDay(r.opened)
    if (sameDay(r.opened, now)) return `Today, ${day}`
    if (sameDay(r.opened, yesterday)) return `Yesterday, ${day}`
    return day
  }
  const row = (key: string, title: string, detail: string, tag: ReactNode, button: ReactNode) => (
    <div className="pb-report-row" key={key}>
      <b>{title}</b>
      <span>{detail}</span>
      <span>{tag}</span>
      <span className="pb-report-btn">{button}</span>
    </div>
  )
  /* What moved that day, from the server's own reading of the deals (quality pass, 18 October, B-24). */
  const movedOn = (r: Any): string => {
    const said = r.opened ? (b.whatMovedEachDay ?? {})[isoDay(new Date(r.opened))] : null
    return said ? ` ${said}` : ''
  }
  const sessionRow = (r: Any) => row(
    `s-${r.sessionNumber}`, titleOf(r), `${r.answered} of ${r.total} checked in.${movedOn(r)}`,
    <Tag tone={r.shared ? 'proven' : 'attention'}>{r.shared ? 'Shared' : 'Not shared'}</Tag>,
    r.shared
      ? <Button kind="secondary" size="small" onClick={() => navigate(`/grounds/${groundId}/session/${r.sessionNumber}`)}>Open</Button>
      : <Button kind="primary" size="small" onClick={() => navigate(`/grounds/${groundId}?tab=report`)}>Share it</Button>,
  )
  const written = theLastSessionThisWeek(b, now)
  const week = weekNumberOf(now)
  const lastMonday = new Date(`${isoDay(now)}T12:00:00Z`)
  lastMonday.setUTCDate(lastMonday.getUTCDate() - ((lastMonday.getUTCDay() + 6) % 7) - 7)
  const [first, second] = sessionRows
  return (
    <Section heading="Reports" note={direct ? undefined : 'Every session has two: each person’s own, and the team’s once you share it'}>
      <div className="pb-rows">
        {sessionRow(first)}
        {row('this-week', 'This week', `Week ${week} so far.${written ? ` Written ${written}.` : ''}`,
          written ? <Tag tone="plain">{written}</Tag> : null,
          <Button kind="secondary" size="small" onClick={() => navigate(`/grounds/${groundId}/report/week`)}>Preview</Button>)}
        {second && sessionRow(second)}
        {sessionRows.length > 5 && row('last-week', `Week ${week - 1}`, 'Last week’s report.', null,
          <Button kind="secondary" size="small" onClick={() => navigate(`/grounds/${groundId}/report/week?week=${lastMonday.toISOString().slice(0, 10)}`)}>Open</Button>)}
      </div>
      <div><Button kind="quiet" to={`/grounds/${groundId}?tab=report`}>{`All ${sessionRows.length} sessions`}</Button></div>
      <Link to={`/grounds/${groundId}?tab=report`} className="pb-wide-btn">Every session</Link>
    </Section>
  )
}

/* ------------------------------------------------------------------ help, other teams */

export function HelpNobodyMentioned({ b }: { b: Any }) {
  /* The direct morning (lib/the-direct-morning.tsx): no note that explains the board or says who sees what. */
  const direct = useTheDirectMorning()
  const h = b.helpNobodyMentioned
  const lines: string[] = Array.isArray(h?.rows) ? h.rows.map((r: Any) => r.says ?? r.text ?? String(r)) : Array.isArray(h?.lines) ? h.lines : h?.says ? [h.says] : []
  if (!h || !lines.length) return null
  return (
    <Section heading="Help nobody mentioned" note={direct ? undefined : 'You see the help, not who said it'}>
      <Panel>{lines.map((l) => <p className="gwui-panel-text" key={l}>{l}</p>)}</Panel>
    </Section>
  )
}

export function WaitingOnOtherTeams({ groundId }: { groundId: string }) {
  const { data } = useQuery({ queryKey: ['check-in-links', groundId], queryFn: () => checkInLinksApi.get(groundId), staleTime: 30_000, retry: false })
  const waiting: Any[] = (data as Any)?.waitingOnOtherTeams ?? []
  if (!waiting.length) return null
  return (
    <Section heading="Waiting on other teams" note="These show on their boards too">
      <EdgeList label="Waiting on other teams">
        {waiting.map((w) => (
          <EdgeRow
            key={w.id}
            kind="look"
            title={w.team ? `${w.team}: ${w.what}` : w.what}
            detail={`Asked ${aShortDay(w.asked)}.${w.says ? ` ${w.says}` : ''}`}
            actions={w.open ? <Button kind="quiet" size="small" to={w.open.to}>{`Open in ${w.open.label}`}</Button> : <Button kind="quiet" size="small" to={`/grounds/${groundId}/trace`}>See where it started</Button>}
          />
        ))}
      </EdgeList>
    </Section>
  )
}

/* ------------------------------------------------------------------ open issues */

const ISSUE_STEPS = ['Unclear', 'Understood', 'Options', 'Decided', 'Being done', 'Checked']

function TheQuietOne({ quiet }: { quiet: { label: string; says: string } }) {
  const [said, setSaid] = useState(false)
  return said ? <p className="gwui-panel-text">{quiet.says}</p> : <Button kind="quiet" size="small" onClick={() => setSaid(true)}>{quiet.label}</Button>
}

export function OpenIssues({ b, renderActions }: { b: Any; renderActions: (a: Any) => ReactNode }) {
  /* The direct morning (lib/the-direct-morning.tsx): no note that explains the board or says who sees what. */
  const direct = useTheDirectMorning()
  const data = b.openIssues
  const all: Any[] = Array.isArray(data?.issues) ? data.issues : []
  /* The picture shows a short row of issues. The first three are drawn, in the engine's order; the rest wait behind one quiet link. */
  const [everyOne, setEveryOne] = useState(false)
  const rows: Any[] = everyOne ? all : all.slice(0, 3)
  if (!data) return null
  /* The kit shows Open issues only with issues in it (quality pass, 18 October, B-25; standing decision 4 of the findings). */
  if (b.releaseOneSalesBoard && !all.length) return null
  return (
    <Section heading="Open issues" note={direct ? undefined : 'Each one moving towards a decision. You always choose'}>
      {all.length === 0 ? (
        <Panel><p className="gwui-panel-text">{data.why ?? 'Nothing is open.'}</p></Panel>
      ) : (
        <div className="pb-issues">
          {rows.map((i) => {
            const at = Math.max(0, ISSUE_STEPS.indexOf(i.step))
            return (
              <Panel key={i.id}>
                <h3 className="pb-card-h">{i.title}</h3>
                <div className="pb-steps">
                  {ISSUE_STEPS.map((s, n) => (
                    <span key={s} className={`pb-step${n < at ? ' pb-step-done' : n === at ? ' pb-step-now' : ''}`}>{n < at ? `✓ ${s}` : n === at ? `${s} (now)` : s}</span>
                  ))}
                </div>
                {i.next && <p className="pb-issue-next">{`Next: ${i.next}`}</p>}
                {i.conversation && (
                  <div className="pb-convo">
                    <b>{i.conversation.heading}</b>
                    <p className="gwui-panel-text">{i.conversation.says}</p>
                    <p className="gwui-panel-text"><b>A way to start:</b> {i.conversation.wayToStart}</p>
                  </div>
                )}
                {i.says && <p className="gwui-panel-text">{i.says}</p>}
                {(i.action || i.quiet) && (
                  <div className="pb-issue-acts">
                    {i.action && renderActions(i.action)}
                    {i.quiet && <TheQuietOne quiet={i.quiet} />}
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      )}
      {all.length > 3 && (
        <Button kind="quiet" onClick={() => setEveryOne((v) => !v)} aria-expanded={everyOne}>
          {everyOne ? 'Show the first three' : `Show all ${all.length}`}
        </Button>
      )}
    </Section>
  )
}

/* ------------------------------------------------------------------ where this is heading */

/* The picture's short name for each ending the engine offers (board-as-lead.txt, kwame-board.txt), in the picture's order. */
const OUTCOME_WORDS: Record<string, string> = {
  ALIGNED: 'On course',
  REACH_WITH_A_CHANGE: 'Reach it with a change',
  GAPS_IDENTIFIED: 'Change the target',
  KEEP: 'Keep on',
  EXTEND: 'Extend settling-in',
  RESTRUCTURE: 'Change the role',
  EXIT: 'Part ways',
}
const OUTCOME_ORDER = ['ALIGNED', 'REACH_WITH_A_CHANGE', 'GAPS_IDENTIFIED', 'KEEP', 'EXTEND', 'RESTRUCTURE', 'EXIT']

export function WhereThisIsHeading({ b, onRecordTheDecision, readOnly = false }: { b: Any; onRecordTheDecision: () => void; readOnly?: boolean }) {
  const d = b.whereThisIsHeading
  if (!d) return null
  const rank = (v: string) => (OUTCOME_ORDER.includes(v) ? OUTCOME_ORDER.indexOf(v) : 99)
  const outcomes: Any[] = (d.outcomes ?? []).filter((o: Any) => o.value !== 'NOT_YET').sort((a: Any, c: Any) => rank(a.value) - rank(c.value))
  return (
    <Section heading={d.heading ?? 'Where this is heading'} note={d.about}>
      <div className="pb-heading">
        <div>
          <h3 className="pb-small-h">The possible outcomes</h3>
          {outcomes.length ? outcomes.map((o) => (
            <div className="pb-outcome" key={o.value}>
              {OUTCOME_WORDS[o.value] ?? o.says}
              {o.more && <span className="pb-outcome-sub">{o.more}</span>}
            </div>
          )) : <p className="gwui-panel-text">{d.outcomesSays}</p>}
        </div>
        <div>
          <h3 className="pb-small-h">The signals behind them</h3>
          {(d.signals ?? []).length ? (d.signals ?? []).map((s: Any, i: number) => (
            <div className="pb-signal" key={i}>
              <span className={`pb-dot ${i === 0 ? 'pb-dot-proof' : 'pb-dot-said'}`} />
              <span><b>{s.says}</b><span className="pb-from">{s.from}</span></span>
            </div>
          )) : <p className="gwui-panel-text">{d.signalsSays}</p>}
          <Panel>
            <h3 className="pb-small-h" style={{ color: 'var(--gw-text)' }}>What would settle it</h3>
            {(d.whatWouldSettleIt ?? []).length
              ? d.whatWouldSettleIt.map((w: string) => <p className="gwui-panel-text" key={w}>{w}</p>)
              : <p className="gwui-panel-text">{d.whatWouldSettleItSays}</p>}
          </Panel>
          <div className="pb-decides">
            <b>{d.whoDecides}</b>
            <p>{d.groundworkDoesNotChoose}</p>
            {d.decided ? <p>{d.decided}</p> : readOnly ? null : <button type="button" className="gwui-btn gwui-btn-secondary" onClick={onRecordTheDecision}>{d.recordTheDecision ?? 'Record the decision'}</button>}
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ ask, and what Groundwork recommends */

export function AskAboutThisBoard({ example }: { example: string }) {
  const [draft, setDraft] = useState('')
  const showWith = useAskStore((s) => s.showWith)
  return (
    <form className="pb-ask" onSubmit={(e) => { e.preventDefault(); const m = draft.trim(); if (!m) return; showWith(m); setDraft('') }}>
      <MessageCircle size={18} aria-hidden="true" />
      <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Ask about this board, for example “${example}”`} aria-label="Ask about this board" />
      <Button kind="primary" type="submit">Ask</Button>
    </form>
  )
}

export function GroundworkRecommends({ offers, onAnswer, busy }: { offers: PicturedBoardProps['recommendations']; onAnswer: (id: string, yes: boolean) => void; busy: boolean }) {
  /* The direct morning (lib/the-direct-morning.tsx): no note that explains the board or says who sees what. */
  const direct = useTheDirectMorning()
  if (!offers.length) return null
  return (
    <Section heading="Groundwork recommends" foot={direct ? undefined : 'One suggestion at a time, only when there’s a real need. Say no once and it won’t come back.'}>
      <EdgeList label="Groundwork recommends">
        {offers.map((o) => (
          <EdgeRow
            key={o.id}
            kind="decide"
            title={o.says}
            detail={o.question ?? undefined}
            actions={(
              <>
                <Button kind="secondary" size="small" disabled={busy} onClick={() => onAnswer(o.id, true)}>{o.yes}</Button>
                <Button kind="quiet" size="small" disabled={busy} onClick={() => onAnswer(o.id, false)}>{o.no}</Button>
              </>
            )}
          />
        ))}
      </EdgeList>
    </Section>
  )
}

/* ------------------------------------------------------------------ the board */

export function TheUpdatedLine({ at }: { at: string | null | undefined }) {
  return <p className="pb-updated">{whenTheBoardLastChanged(at)}</p>
}

export function ThePicturedSalesBoard(p: PicturedBoardProps) {
  const { b } = p
  const now = useMemo(() => new Date(), [])
  const deals = (b.workRecords ?? []).find((s: Any) => s.section === 'Deal grid' && (s.rows ?? []).some((r: Any) => r.kind === 'deal')) ?? null
  const groups = dealsByGroup(deals)
  const nextQuarterDeal = (groups['next-quarter'] ?? [])[0]
  const example = nextQuarterDeal ? `Why is ${nextQuarterDeal.name} next quarter?` : 'Who is waiting on whom?'
  return (
    <div className="pb">
      <HeadlineAndGap b={b} deals={deals} groups={groups} />
      <WhatTheTargetAssumes b={b} />
      {/* An admin who only reads is never told "What needs you": it is not hers to do (the light board's rule, kept). */}
      {!p.readOnly && <WhatNeedsYou b={b} renderActions={p.renderActions} groundId={p.groundId} deals={deals} sessionRows={p.sessionRows} />}
      {deals && <EveryDealDayByDay b={b} section={deals} now={now} groundId={p.groundId} />}
      {p.otherRecords}
      <TheTeamToday b={b} deals={deals} today={isoDay(now)} groundId={p.groundId} />
      {p.yourTeam}
      <Blockers b={b} groundId={p.groundId} />
      <WhatKeepsComingUp b={b} />
      <ReportedAgainstCriteria b={b} />
      <WhoCheckedIn b={b} />
      {p.overTime}
      <Reports b={b} groundId={p.groundId} sessionRows={p.sessionRows} navigate={p.navigate} now={now} />
      <HelpNobodyMentioned b={b} />
      <WaitingOnOtherTeams groundId={p.groundId} />
      <OpenIssues b={b} renderActions={p.readOnly ? () => null : p.renderActions} />
      <WhereThisIsHeading b={b} onRecordTheDecision={p.onRecordTheDecision} readOnly={p.readOnly} />
      <AskAboutThisBoard example={example} />
      <GroundworkRecommends offers={p.recommendations} onAnswer={p.onAnswerRecommendation} busy={p.recommendationBusy} />
      {p.kindOfWork}
    </div>
  )
}

/**
 * A PERSON'S OWN DEALS, AS PICTURED (board-as-participant.jpg: "Your deals, day by day", "Only yours"). The
 * server has already narrowed this reader's board to their own rows (a-participants-board-is-their-own.ts);
 * this draws them in the lead's grid, with the open deal named as theirs.
 */
export function ThePicturedOwnDeals({ b, groundId, myFirstName }: { b: Any; groundId: string; myFirstName: string | null }) {
  const now = useMemo(() => new Date(), [])
  const section = (b.workRecords ?? []).find((s: Any) => s.section === 'Deal grid' && (s.rows ?? []).some((r: Any) => r.kind === 'deal'))
  if (!section) return null
  const mine = { ...section, rows: (section.rows ?? []).filter((r: Any) => r.kind !== 'deal' || !r.ownerParticipantId || r.ownerParticipantId === b.myParticipantId) }
  return <EveryDealDayByDay b={b} section={mine} now={now} groundId={groundId} heading="Your deals, day by day" note="Only yours" ownTag={myFirstName ? 'Your deal' : null} />
}

/** The board's own ask bar, with an example from this board's deals ("Why is Green Mart next quarter?"). */
export function ThePicturedAskBar({ b }: { b: Any }) {
  const deals = (b.workRecords ?? []).find((s: Any) => s.section === 'Deal grid') ?? null
  const next = (deals?.rows ?? []).find((r: Any) => r.kind === 'deal' && r.group === 'next-quarter')
  return <AskAboutThisBoard example={next ? `Why is ${next.name} next quarter?` : 'Who is waiting on whom?'} />
}
