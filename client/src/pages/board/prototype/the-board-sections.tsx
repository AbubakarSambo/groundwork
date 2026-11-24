/**
 * THE SECTIONS EVERY PICTURED BOARD SHARES, ON THE DESIGN SYSTEM (Hafsah, 24 November 2026).
 *
 * The sales board (journey 3, 23 November) drew "What needs you", "The team today", "Blockers", "What keeps coming up", "Reported vs
 * criteria met" and "Who checked in" from the shared blocks. The goals and new-project boards drew the same sections again in the
 * prototype's own markup, so one section looked two ways. Each is now drawn once, here, and every board reads it.
 *
 * Every slot is the board the server served this reader, after every privacy wall (board.service.ts). Nothing here decides who may
 * read what.
 */
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Section, Panel, EdgeList, EdgeRow, Tag, Table, Empty, Button } from '@/components/gw/ui'
import { namesToCallAmong } from '@/lib/names-that-tell-people-apart'
import { TheNudgeButton } from '../pictured/TheNudgeButton'
import { CORRECT_IT_HERE } from '../pictured/TheBar'
import { lastTen, aTagForTheWork, aShortDay, NOTHING_BOOKED, type ANeed } from '../pictured/ThePicturedSalesBoard'

type Any = any

export const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || ''
/* Each person by first name, and by the whole name where somebody else on the check-in has the same first name (page audit, 24 November, row 11). */
export const callThemOn = (b: Any) => namesToCallAmong(((b?.participants ?? []) as Any[]).map((p) => p?.name))
/**
 * A person by the name on record for them, told apart from anyone with the same first name. With no name on record they are said as
 * the server says them ("One colleague"), in full: the first word of that is not a name (the goals board called somebody "One").
 */
export const calledOn = (b: Any) => {
  const call = callThemOn(b)
  const nameOf = new Map<string, string>(((b?.participants ?? []) as Any[]).filter((p) => p?.name?.trim()).map((p) => [p.id, p.name]))
  return (participantId: string, said: string | null | undefined) => (nameOf.has(participantId) ? call(nameOf.get(participantId)) : (said ?? ''))
}
export const capital = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
export const inWords = (n: number) => (n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n))

/** Whoever runs the check-in, never counted among the team. */
const theLeadOf = (b: Any): string | null => (b.participants ?? []).find((x: Any) => x.partyType === 'INITIATOR')?.id ?? null

/** Each person's own page on this check-in, where The team today links their name. */
const theirPage = (groundId: string, participantId: string) => `/grounds/${groundId}/person/${participantId}`

/** The last ten check-ins as ten small squares, filled where the person checked in (the design system's squares). */
export function TenSquares({ squares }: { squares: string[] }) {
  return (
    <svg className="ds-squares" viewBox={`0 0 ${squares.length * 13} 18`} role="img"
      aria-label={`Checked in ${squares.filter((s) => s === 'done').length} of the last ${squares.length}.`}>
      {squares.map((s, i) => <rect key={i} className={s === 'done' ? 'on' : 'off'} x={i * 13 + 0.75} y="0.75" width="9.5" height="16.5" rx="2.5" />)}
    </svg>
  )
}

/** "What needs you in this check-in": each thing as a row, the engine's own buttons on its right for whoever runs it. */
export function WhatNeedsYou({ needs, lead, renderActions }: { needs: ANeed[]; lead: boolean; renderActions: (action: Any) => ReactNode }) {
  if (!needs.length) return null
  return (
    <Section heading="What needs you in this check-in">
      <EdgeList label="What needs you in this check-in">
        {needs.map((n) => (
          <EdgeRow key={n.key} kind={n.kind} title={n.title} detail={n.detail} actions={lead && (n.node || n.action) ? (n.node ?? renderActions(n.action)) : undefined} />
        ))}
      </EdgeList>
    </Section>
  )
}

/** "Where each target stands": each target with a number, its count against it, and where the server says it stands. */
export function WhereEachTargetStands({ b }: { b: Any }) {
  const aims: Any[] = ((b.objectives ?? []) as Any[]).filter((o) => o.target != null)
  if (!aims.length) return null
  const aNumber = (n: unknown) => Number(n ?? 0).toLocaleString('en-GB')
  return (
    <Panel as="section" heading="Where each target stands">
      <EdgeList label="Where each target stands">
        {aims.map((o) => (
          <EdgeRow key={o.id} title={o.name} detail={`${aNumber(o.count)} of ${aNumber(o.target)}`}
            actions={o.stands?.word ? <Tag tone={/^(on track|met|reached|ahead)/i.test(o.stands.word) ? 'proven' : 'attention'}>{capital(o.stands.word)}</Tag> : undefined} />
        ))}
      </EdgeList>
    </Panel>
  )
}

/** What shows a record, in the prototype's words ("Proof shows it", "Rep said"). */
const WHAT_SHOWS_IT: Record<string, string> = { proven: 'Proof shows it', confirmed: 'Confirmed', memory: 'From memory', none: 'Added here' }

/**
 * "EVERY SALE, AND WHAT SHOWS IT" (salesorg.txt) and "Every task, and what shows it" (the engineering release): one row for each record,
 * who owns it, its stage, what shows it and what is next; select one for its detail. `one` is the record's own word ("sale", "task",
 * "incident"), `owner` the column's ("Rep", "Owner"), `said` how a person's word is named ("Rep said", "Their own word").
 */
export function EveryRecordAndWhatShowsIt({ b, groundId, rows, one, many, owner, said, navigate }: {
  b: Any; groundId: string; rows: Any[]; one: string; many: string; owner: string; said: string; navigate: (to: string) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = rows.find((r) => r.id === openId) ?? rows[0] ?? null
  const who = (r: Any) => (r.ownerParticipantId && r.ownerParticipantId === b.myParticipantId ? 'You' : firstName(r.owner))
  const next = (r: Any) => r.nextStep ?? r.next ?? NOTHING_BOOKED
  return (
    <Section heading={`Every ${one}, and what shows it`} note="Select one for its detail." foot={rows.length ? CORRECT_IT_HERE : undefined}>
      {rows.length === 0 ? <Empty>{`No ${many} are on record yet.`}</Empty> : (
        <>
          <Table
            caption={`Every ${one}, and what shows it`}
            onPanel={false}
            limit={50}
            columns={[
              { key: 'name', header: capital(one), rowHeader: true, width: '28%' },
              { key: 'owner', header: owner },
              { key: 'stage', header: 'Stage now' },
              { key: 'shows', header: 'What shows it' },
              { key: 'next', header: 'Next' },
            ]}
            rows={rows.map((r) => ({
              _highlight: r.id === open?.id,
              name: <Button kind="quiet" onClick={() => setOpenId(r.id)} aria-pressed={r.id === open?.id}>{r.name}</Button>,
              owner: who(r),
              stage: r.stage ?? 'No stage said yet',
              shows: r.mark === 'proven' ? { tag: WHAT_SHOWS_IT.proven, tone: 'proven' } : (WHAT_SHOWS_IT[r.mark ?? ''] ?? said),
              next: next(r),
            }))}
          />
          {open && (
            <div className="ds-grid ds-grid-2">
              <Panel as="section" aria-label={open.name}>
                <p className="ds-text-card">{open.name}</p>
                <div role="list" aria-label={`About ${open.name}`}>
                  {Object.entries(open.fields ?? {}).map(([k, v]) => (
                    <div key={k} className="ds-when" role="listitem"><span className="ds-text-secondary">{capital(k)}</span><span className="ds-text-secondary">{String(v)}</span></div>
                  ))}
                </div>
                {open.said && <p className="ds-text-body">{`“${open.said}”`}</p>}
                <p className="ds-text-secondary ds-note-act"><b>Next:</b> {next(open)}</p>
                <Button kind="quiet" onClick={() => navigate(`/grounds/${groundId}`)}>Not right? Tell the check-in</Button>
              </Panel>
              {(open.contactHistory ?? []).length > 0 && (
                <Panel as="section" heading="Contact history">
                  <div role="list" aria-label="Contact history">
                    {open.contactHistory.slice(0, 5).map((c: Any) => (
                      <div key={c.on} className="ds-when" role="listitem">
                        <span className="ds-text-secondary ds-num">{aShortDay(`${c.on}T12:00:00Z`)}</span>
                        <span className="ds-text-secondary">{c.says ?? (/proof/i.test(c.how ?? '') ? 'With proof' : 'In their words')}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </div>
          )}
        </>
      )}
    </Section>
  )
}

/**
 * "THE TEAM TODAY": each person's line, what their work shows, their last ten check-ins, and what keeps coming up, with the nudge for
 * whoever runs it. `records` are the rows their work tag is read against (a sales team's deals; none for other work).
 */
export function TheTeamToday({ b, groundId, lead, records = [], today }: { b: Any; groundId: string; lead: boolean; records?: Any[]; today: string }) {
  const leadId = theLeadOf(b)
  const team: Any[] = (b.eachPersonToday ?? []).filter((r: Any) => r.participantId !== leadId)
  if (!team.length) return null
  const reasonOf = new Map<string, string>((b.eachPerson ?? []).map((x: Any) => [x.participantId, x.reason]))
  const keepsOf = (pid: string): string | null => {
    const row = team.find((r) => r.participantId === pid)
    const pat = (b.patterns ?? []).find((x: Any) => x.participantId === pid && x.about !== 'what is said against what happened' && x.whatHappened)
    return row?.keepsComingUp ?? (pat ? String(pat.whatHappened).replace(/\.$/, '') : null)
  }
  return (
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
          const tag = aTagForTheWork(reason, records.filter((d) => d.ownerParticipantId === r.participantId), today, r.workTag)
          return {
            who: <Link to={theirPage(groundId, r.participantId)}>{calledOn(b)(r.participantId, r.who)}</Link>,
            line: r.line,
            tag: tag ? { tag: tag.word, tone: tag.tone === 'proven' ? 'proven' : tag.tone === 'attention' ? 'attention' : 'plain' } : '',
            squares: <TenSquares squares={lastTen(b, r.participantId)} />,
            keeps: keepsOf(r.participantId) || (lead && r.nudge) ? <>{keepsOf(r.participantId)}{lead && r.nudge && <> <TheNudgeButton groundId={groundId} nudge={r.nudge} /></>}</> : null,
          }
        })}
      />
    </Section>
  )
}

/** "BLOCKERS": each with its history and the one thing that would clear it. `records` are the deals whose waits on a customer are said instead. */
export function Blockers({ b, blockers, records = [] }: { b: Any; blockers: Any[]; records?: Any[] }) {
  return (
    <Section heading="Blockers" note="Each with its history and the one thing that would clear it.">
      {blockers.length ? blockers.map((x) => {
        const isADecision = !!b.myParticipantId && x.onParticipantId === b.myParticipantId
        const tag = isADecision ? { tone: 'action' as const, word: 'Decision' } : x.state === 'blocking' ? { tone: 'concern' as const, word: 'Blocking' } : { tone: 'attention' as const, word: 'Waiting' }
        const on = isADecision ? 'You' : (x.on ?? x.onLabel ?? null)
        return (
          <Panel as="section" key={x.id} aria-label={x.name ?? x.says}>
            <p className="ds-spread"><span className="ds-text-card">{x.name ? capital(x.name) : x.says}</span><Tag tone={tag.tone}>{tag.word}</Tag></p>
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
          const waits = records.filter((r) => (r.waitingOnTheCustomer ?? []).length > 0).length
          return `Nobody has raised anything that blocks the team.${waits ? ` ${waits === 1 ? 'The one wait on a customer is on its deal' : `The ${inWords(waits)} waits on customers are on their deals`}, above.` : ''}`
        })()}</p>
      )}
    </Section>
  )
}

/** "WHAT KEEPS COMING UP": about each person's work, and how what people say can run ahead of what happened. Not drawn when nothing has. */
export function WhatKeepsComingUp({ b }: { b: Any }) {
  const carried: Any[] = (b.keepsComingUp ?? []).map((x: Any, i: number) => ({ id: `carried-${i}`, participantId: x.participantId, yours: x.yours, about: 'the work', whatHappened: x.says }))
  const patterns: Any[] = [...(b.patterns ?? []), ...carried]
  if (!patterns.length) return null
  const nameOf = new Map<string, string>((b.participants ?? []).map((x: Any) => [x.id, firstName(x.name)]))
  const aboutTheWork = patterns.filter((x) => x.about !== 'what is said against what happened')
  const aboutWhatIsSaid = new Map<string, Any[]>()
  for (const x of patterns.filter((y) => y.about === 'what is said against what happened')) aboutWhatIsSaid.set(x.heading, [...(aboutWhatIsSaid.get(x.heading) ?? []), x])
  return (
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
  )
}

/** "REPORTED VS CRITERIA MET": stage by stage, outlined where people reported and filled where the criteria are met. Not drawn with no stage. */
export function ReportedAgainstTheCriteria({ b, heading = 'Reported vs criteria met, stage by stage' }: { b: Any; heading?: string }) {
  const stages: Any[] = b.reportedAgainstCriteria?.stages ?? []
  if (!stages.length) return null
  const most = Math.max(1, ...stages.map((s) => s.reported ?? 0), ...stages.map((s) => s.met ?? 0))
  return (
    <Section heading={heading} note="The shape of the work." foot="Outlined: what people reported. Filled: what meets the criteria.">
      <Table
        caption={heading}
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
  )
}

/** "WHO CHECKED IN": the last ten sessions, one row each, never the lead. `sortBy` orders the rows (the goals board sorts by team). */
export function WhoCheckedIn({ b, sortBy, foot }: { b: Any; sortBy?: (pid: string) => string; foot?: string }) {
  const leadId = theLeadOf(b)
  const rows: Any[] = ((b.checkInGrid?.rows ?? []) as Any[]).filter((r) => !r.managingOnly && r.participantId !== leadId)
  if (!rows.length) return null
  /* Somebody with no name on record is said as The team today says them ("A colleague"), never as a blank. */
  const saidAs = new Map<string, string>(((b.eachPersonToday ?? []) as Any[]).map((r) => [r.participantId, r.who]))
  const sorted = sortBy ? [...rows].sort((a, c) => sortBy(a.participantId).localeCompare(sortBy(c.participantId))) : rows
  return (
    <Section heading="Who checked in" note="The last 10 sessions, one row each." foot={foot}>
      <Table
        caption="Who checked in"
        hideHeader
        onPanel={false}
        limit={50}
        columns={[{ key: 'who', header: 'Who', rowHeader: true, width: '20%' }, { key: 'squares', header: 'The last 10 sessions' }]}
        rows={sorted.map((r) => ({ who: calledOn(b)(r.participantId, r.name || saidAs.get(r.participantId)), squares: <TenSquares squares={lastTen(b, r.participantId)} /> }))}
      />
    </Section>
  )
}
