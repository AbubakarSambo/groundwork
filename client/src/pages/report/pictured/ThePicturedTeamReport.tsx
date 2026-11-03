import { theZoneDatesAreIn } from '@/lib/a-date-reads-the-same-everywhere'
import { ThatsNotRight } from '@/components/gw/ThatsNotRight'
import { useTheDirectMorning, isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Page, PageTitle, Section, Panel, Button } from '@/components/gw/ui'
import { reportsApi } from '@/api/reports'
import { boardApi } from '@/api/board'
import { isASalesKind } from '@/lib/a-sales-kind'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import '../../board/pictured/pictured-board.css'
import { TheCheckInsOwnHeader } from './TheCheckInsOwnHeader'
import { TheCollectionsTeamReportSections } from '../../board/pictured/TheCollectionsBoard'
import type { TheCollectionsTeamReport } from '@/lib/collect-whats-owed'

/**
 * THE TEAM'S REPORT FOR ONE SESSION, AS PICTURED, FOR WHOEVER RUNS THE CHECK-IN (screen match, 16 October;
 * docs/prototype/screens/B4-reports-and-sharing/team-report.jpg, "#/c/sales/report/team").
 *
 * Everything here is what the server already serves this reader for this session (`GET /grounds/:id/report/session/:n`)
 * and on the board, after every wall: the picture in short, each person's own lines and what they said they would do,
 * where people see it differently in their own words, how much the report can rely on and why, what it cannot tell,
 * and the one question the lead wrote down to settle. Nothing is worked out or worded here beyond putting it in the
 * picture's order. The report is shared only by the lead's own press, named or without names (`sendToEveryone`, the
 * same wrapper the rest of the product uses). The whole report as it was stays one tap away ("?whole=1").
 */
type Any = any

const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || ''
const aDay = (at: string | Date) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: theZoneDatesAreIn() }).format(new Date(at))
const aTime = (at: string | Date) => new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: theZoneDatesAreIn() }).format(new Date(at)).replace(':00', '').replace(/\s/g, '').toLowerCase()
const isoDay = (at: string | Date) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: theZoneDatesAreIn() }).format(new Date(at))
const listed = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? '')
const RELY: Record<string, string> = { thin: 'low', partial: 'medium', solid: 'high' }
const theNoFor = (yes: string) => (/^Yes, it /.test(yes) ? 'No, it doesn’t' : 'No')

export function ThePicturedTeamReport({ groundId, sessionNumber, ground }: { groundId: string; sessionNumber: number; ground: Any }) {
  /* The direct morning (lib/the-direct-morning.tsx): no explanation of the report or of Groundwork. Who reads it is the backend's rule. */
  const direct = useTheDirectMorning() || isTheDirectMorningOn(ground)
  const qc = useQueryClient()
  const me = useAuthStore((st) => st.user)
  const myName = [me?.firstName, (me as Any)?.lastName].filter(Boolean).join(' ').trim()
  const { data: r } = useQuery({
    queryKey: ['session-shaped-report', groundId, sessionNumber],
    queryFn: () => reportsApi.sessionReport(groundId, sessionNumber),
    retry: false,
  })
  const { data: board } = useQuery({ queryKey: ['board', groundId], queryFn: () => boardApi.get(groundId), retry: false })
  const share = useMutation({
    mutationFn: (how: 'NAMED' | 'ANONYMOUS') => reportsApi.sendToEveryone(groundId, how),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-shaped-report', groundId] })
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      toast.success('Shared with the team.')
    },
    onError: (e: Any) => toast.error(e?.response?.data?.message ?? 'That did not share. Nothing has changed, so try again.'),
  })
  const answer = useMutation({
    mutationFn: (route: { method: string; path: string; body: Any }) => (route.method === 'PATCH' ? apiClient.patch(route.path, route.body) : apiClient.post(route.path, route.body)),
    onSuccess: (res: Any) => { qc.invalidateQueries({ queryKey: ['board', groundId] }); toast.success(res?.data?.saidBack ?? 'This is now in how we work.') },
    onError: () => toast.error('That didn’t save. Try again.'),
  })
  const [opened, setOpened] = useState<string | null>(null)
  const rep: Any = r
  const b: Any = board
  /* Release 1's sales team report, read from the deals on the server (the-sales-readings-for-a-report): the day, In short, what moved and why the numbers don't match. */
  const teamsDay: Any = rep?.theTeamsDay ?? null
  /* Release 2's team report on the bills, served only to whoever runs a collections check-in (the-collections-readings-for-a-report). */
  const collections: TheCollectionsTeamReport | null = rep?.collectionsReport ?? null
  const label = ground?.label ?? b?.title ?? 'This check-in'
  if (!rep) return <Page><PageTitle crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label, to: `/grounds/${groundId}/board` }, { label: 'Reports' }]} subtitle="Getting the report…" /></Page>

  /* The session's day from the board's own spine, or, where a board has none, from the session's own check-ins. */
  const sessionDay = (b?.phaseSpine?.sessions ?? []).find((s: Any) => s.n === sessionNumber)?.opensOn
    ?? ((ground?.checkIns ?? []) as Any[]).find((c) => c.sessionNumber === sessionNumber && c.availableFrom)?.availableFrom ?? null
  const mine = ((ground?.checkIns ?? []) as Any[]).filter((c) => c.sessionNumber === sessionNumber && c.completedAt)
  const lastIn = mine.sort((a, c) => String(c.completedAt).localeCompare(String(a.completedAt)))[0] ?? null
  const lastInName = lastIn ? firstName(((ground?.participants ?? []) as Any[]).find((p) => p.id === lastIn.participantId)?.user?.firstName) : ''
  const counting: Any[] = rep.counting ?? []
  const answered = counting.filter((c) => c.answered)
  const notIn = counting.filter((c) => !c.answered).map((c) => firstName(c.who))
  const confidence = rep.confidence

  /* What moved this session: each deal somebody spoke about on the session's day, with its stages. */
  const grid = (b?.workRecords ?? []).find((s: Any) => s.section === 'Deal grid')
  const stages: string[] = (grid?.stages ?? []).slice(0, -1)
  const day = sessionDay ? isoDay(sessionDay) : null
  const moved: Any[] = teamsDay
    ? ((teamsDay.moved ?? []) as Any[]).map((m) => {
      const row = (grid?.rows ?? []).find((x: Any) => x.id === m.dealId) ?? (grid?.rows ?? []).find((x: Any) => x.name === m.name) ?? {}
      /* The line is what moved, from the server (whatAMoveSays): the stage it reached and the owner's own line about it, never the
         deal's latest sentence, which can be about a budget nobody gave (Drop Access, 18 October). */
      return { ...row, id: m.dealId, name: m.name, owner: m.owner ?? row.owner, stage: m.to, mark: m.proven ? 'proven' : 'said', movedSays: typeof m.says === 'string' ? m.says : null }
    })
    : day ? (grid?.rows ?? []).filter((row: Any) => row.kind !== 'county' && row.lastSaidOn === day) : []
  const isSales = isASalesKind(b?.kindOfWork ?? ground?.kindOfWork)
  /* kwame-team-report.jpg: a check-in about one new person is named by that person and the session. */
  const onboardingSubject = b?.family === 'ONBOARDING' ? firstName(((b?.participants ?? []) as Any[]).find((p) => p.partyType !== 'INITIATOR' && !p.managingOnly)?.name) : ''

  /* What each person said they would do this session, from the board's own lines. */
  const willDo = (who: string): string | null => {
    const row = (b?.whoOwnsWhat ?? []).find((w: Any) => w.name === who)
    const it = (row?.items ?? []).find((i: Any) => i.type === 'COMMITMENT' && i.sessionNumber === sessionNumber)
    if (!it) return null
    if (!teamsDay) return String(it.text).replace(/^[^"“]*?said,\s*/i, '').replace(/^["“]|["”]$/g, '')
    /* On Release 1's sales team report: who "him" is, where the check-in names him (the server's withTheName); otherwise their own words, and where they say
       "him" or "her" with nobody named, in quotation marks as theirs. */
    if (typeof it.withTheName === 'string' && it.withTheName.trim()) return it.withTheName.trim()
    const words = String(it.text).replace(/^[^"“]*?said,\s*/i, '').replace(/^["“]|["”]$/g, '')
    return /\b(?:him|her)\b/i.test(words) && /said,\s*["“]/.test(String(it.text)) ? `"${words}"` : words
  }
  const differences: Any[] = rep.whereThingsStand?.openWithReasons ?? []
  const toThisCheckIn = (x: Any) => (x?.action?.choices ?? []).length && (x.action.choices as Any[]).every((c: Any) => !c.route || String(c.route.path ?? '').startsWith(`/grounds/${groundId}/`))
  /*
   * The question the lead wrote down to settle, or else a wait on the lead that a yes or a no answers (Joseph Kariuki's
   * "an answer about the KES 4,500 price for Juja Hardware"), answered the same way as on the board, so both update.
   * The server sends either only to the lead, and the second only with Release 1's sales board on; with neither, the section is not shown.
   */
  const question: Any = (b?.decisions ?? []).find(toThisCheckIn)
    ?? ((b?.leadActions ?? []) as Any[]).filter((a) => a?.decision?.question && toThisCheckIn(a)).map((a) => ({ question: a.decision.asked ?? a.decision.question, why: a.decision.why, afterwards: a.decision.afterwards, action: a.action }))[0]

  /* faith90-team-report.jpg: before anybody has checked in there is no team report yet, and the page says when there will be. */
  if (counting.length && !answered.length) {
    return (
      <Page>
        {/* faith90-team-report.jpg: the check-in's own header as the board draws it, "Your check-in" and the tabs, above the first report's note. */}
        <TheCheckInsOwnHeader groundId={groundId} ground={ground} sessionNumber={sessionNumber} label={label} />
        {lastIn && (
          <p className="pb-updated">{`Last updated on ${aDay(lastIn.completedAt)} at ${aTime(lastIn.completedAt)}${lastInName ? `, when ${lastInName} checked in` : ''}.${direct ? '' : ' It only changes when something new comes in, such as a check-in, a document or a number from another system.'}`}</p>
        )}
        <Panel className="pb-first-report">
          <h3 className="pb-card-h">The first team report</h3>
          <p className="gwui-panel-text">It’s written once everyone has checked in, and only you see it until you share it.</p>
        </Panel>
      </Page>
    )
  }

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label, to: `/grounds/${groundId}/board` }, { label: 'Reports' }]}
        /* one-session.jpg: a shared session is named by its number; today's, not shared yet, by its day. */
        title={collections ? collections.title : onboardingSubject ? `${onboardingSubject}, session ${sessionNumber}` : teamsDay?.title ? teamsDay.title : rep.released ? `Session ${sessionNumber}` : sessionDay ? `The team’s report, ${aDay(sessionDay)}` : `The team’s report, session ${sessionNumber}`}
      />
      {/* team-report.jpg: when it last changed and who checked in on the left, "Yesterday" and "This week" as buttons on the right. */}
      <div className="pb-report-head">
        <div>
          {teamsDay?.lastUpdated
            ? <p className="pb-updated">{direct ? String(teamsDay.lastUpdated).replace(' It only changes when something new comes in, such as a check-in, a document or a number from another system.', '') : teamsDay.lastUpdated}</p>
            : lastIn && (
              <p className="pb-updated">{`Last updated on ${aDay(lastIn.completedAt)} at ${aTime(lastIn.completedAt)}${lastInName ? `, when ${lastInName} checked in` : ''}.${direct ? '' : ' It only changes when something new comes in, such as a check-in, a document or a number from another system.'}`}</p>
            )}
          <p className="pb-report-count">
            {`Session ${sessionNumber}. ${answered.length} of ${counting.length} people checked in.`}
            {notIn.length > 0 && ` ${listed(notIn)} had not checked in${lastIn ? ` by ${aTime(lastIn.completedAt)}` : ' yet'}.`}
          </p>
        </div>
        <div className="pb-report-links">
          {sessionNumber > 1 && <Button kind="secondary" to={`/grounds/${groundId}/session/${sessionNumber - 1}`}>Yesterday</Button>}
          <Button kind="secondary" to={`/grounds/${groundId}/report/week`}>This week</Button>
        </div>
      </div>

      {!rep.released ? (
        <div className="pb-share pb-share-report">
          <div>
            <h3 className="pb-card-h">Only you can see this until you share it</h3>
            <p className="gwui-panel-text">When you share this report, everyone in the team gets it, with names. Each person already has their own report of what they said today.</p>
          </div>
          <div className="pb-share-actions">
            <Button kind="secondary" onClick={() => share.mutate('ANONYMOUS')} disabled={share.isPending}>Share without names</Button>
            <Button kind="primary" onClick={() => share.mutate('NAMED')} disabled={share.isPending}>Share with the team</Button>
          </div>
        </div>
      ) : (
        <Panel>
          <h3 className="pb-card-h">Shared with the team</h3>
          <p className="gwui-panel-text">Everyone in the team got this report, and each person has their own report of what they said.</p>
        </Panel>
      )}

      {confidence?.saying && (
        <Panel>
          {/* team-report.jpg: three bars, as many filled as the report can rely on, beside the reading in bold and its reasons under it. */}
          <div className="pb-rely">
            <span className="pb-rely-bars" aria-hidden="true">
              {[1, 2, 3].map((i) => <i key={i} className={i <= (({ thin: 1, partial: 2, solid: 3 } as Record<string, number>)[confidence.band] ?? 0) ? 'on' : ''} />)}
            </span>
            <div>
              <p className="pb-rely-h">{`How much this report can rely on: ${RELY[confidence.band] ?? 'not said'}. ${confidence.saying}`}</p>
              {((confidence.reasons ?? []) as string[]).length > 0 && <p className="pb-sub pb-rely-why">{(confidence.reasons as string[]).join(' ')}</p>}
            </div>
          </div>
        </Panel>
      )}

      {/* Release 2: on a "Collect what's owed" check-in where the switchboard picks the collections board, the team's report on the
          bills, in the full shape, as the server words it (the-collections-reports); every other check-in reads the sections below. */}
      {collections ? <TheCollectionsTeamReportSections r={collections} /> : (<>
      {/* F5, Hafsah's change 4 to the approved journey: the report opens with where things stand and what needs the lead, then
         where people differ and what is not known yet, then what moved and what each person did. */}
      {/* team-report.jpg: "In short" is the report's own few sentences on the page, not in a box. */}
      <Section heading="In short">
        {teamsDay
          ? <div className="pb-in-short">{((teamsDay.inShort ?? []) as string[]).map((l) => <p className="pb-read" key={l}>{l}</p>)}</div>
          : ((rep.pictureLines ?? []) as string[]).length
          ? <div className="pb-in-short">{(rep.pictureLines as string[]).map((l) => <p className="pb-read" key={l}>{l}</p>)}</div>
          : <p className="gwui-panel-text">{rep.finding?.text ?? 'Nothing is written for this session yet.'}</p>}
      </Section>

      {/* team-report.jpg: the lead's own question, in a dark-edged box with the heading inside it. The other check-ins' team
          reports have no question to answer and no such section; the conversation worth having is on "?whole=1". */}
      {question && (
        <div className="pb-question">
          <h3 className="pb-box-h">One question to answer</h3>
          <p className="pb-read">{question.question}</p>
          {question.why && <p className="gwui-panel-text">{question.why}</p>}
          <div className="pb-relevant-actions">
            {(question.action.choices as Any[]).filter((c) => c.route).map((c, i) => (
              <Button key={c.label} kind={i === 0 ? 'primary' : /^No\b/.test(c.label) ? 'quiet' : 'secondary'} disabled={answer.isPending} onClick={() => answer.mutate(c.route)}>{/^No$/.test(c.label) ? theNoFor((question.action.choices as Any[])[0].label) : c.label}</Button>
            ))}
          </div>
          {/* For a wait on the lead, only what the record can say the answer does: the wait is cleared. */}
          <p className="pb-foot">{question.afterwards ?? 'Your answer updates the board, and everyone counts the same way from now on.'}</p>
        </div>
      )}

      {/* Quality pass, 18 October, T-8: on Release 1's sales check-in, what the record shows in full sentences, never the model's fragments. */}
      {teamsDay && ((teamsDay.whereTheySeeItDifferently ?? []) as string[]).length > 0 && (
        <Section heading={direct ? 'Where people said different things' : 'Where people see it differently'}>
          <Panel>{(teamsDay.whereTheySeeItDifferently as string[]).map((l) => <p className="gwui-panel-text" key={l}>{l}</p>)}</Panel>
        </Section>
      )}
      {!teamsDay && differences.length > 0 && (
        <Section heading={direct ? 'Where people said different things' : 'Where people see it differently'}>
          {/* team-report.jpg: one panel, each side in its own column, the name in bold over what they said. */}
          {differences.map((d) => (
            <Panel key={d.topic}>
              <div className="pb-two pb-sides">
                {(d.positions ?? []).map((x: Any) => (
                  <div key={x.who}>
                    <p className="pb-side-h">{x.who === myName || x.who === 'You' ? 'You' : firstName(x.who)}</p>
                    <p className="gwui-panel-text">{`“${x.view}”`}</p>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </Section>
      )}

      <Section heading="What this report can’t tell you">
        {/* team-report.jpg: plain sentences on the page, not in a box. */}
        <div className="pb-cant-tell">
          {notIn.length > 0 && <p>{`It cannot show ${listed(notIn.map((n) => `${n}’s`))} day, because ${listed(notIn)} did not check in.`}</p>}
          {rep.whatWentQuiet && <p>{rep.whatWentQuiet}</p>}
          {!notIn.length && !rep.whatWentQuiet && <p>Everybody checked in, and nothing anybody was waiting on has gone quiet.</p>}
        </div>
        {/* danielpip-team-report.jpg: a way to say something here is wrong, which the check-in takes in, and the change and the original both show. */}
        <div><Button kind="quiet" to={`/grounds/${groundId}`}>Something here isn’t right</Button></div>
      </Section>

      {/* What was asked and not answered yet, and what happens next (moved up in F5 with what isn't known yet). Served to whoever runs the check-in only (what-i-dont-know-yet.ts). */}
      {!collections && Array.isArray(rep.whatIDontKnowYet) && (
        <Panel className="pb-unknowns">
          <h3 className="pb-box-h">What I don’t know yet</h3>
          {!direct && <p className="pb-sub pb-unknowns-note">Things Groundwork can’t tell from what it has, and what it will ask next.</p>}
          {(rep.whatIDontKnowYet as Any[]).length
            ? (rep.whatIDontKnowYet as Any[]).map((x, i) => (
              <div className="pb-unknown" key={i}>
                <p className="pb-card-h">{x.title}</p>
                <p className="pb-sub">{x.says}</p>
              </div>
            ))
            : <p className="gwui-panel-text">{direct ? 'Nothing asked for in this check-in is still waiting for an answer.' : 'Nothing Groundwork asked for in this check-in is still waiting for an answer.'}</p>}
        </Panel>
      )}

      {/* sales-team-report.txt: "Why the numbers don’t match", only where the record can work it out (the price range). */}
      {((teamsDay?.whyTheNumbersDontMatch ?? []) as string[]).length > 0 && (
        <Section heading="Why the numbers don’t match">
          <div className="pb-cant-tell">{(teamsDay.whyTheNumbersDontMatch as string[]).map((l) => <p key={l}>{l}</p>)}</div>
        </Section>
      )}

      {moved.length > 0 && (
        <Section heading="What moved" note="Ringed is someone’s word; filled is proven">
          <div className="pb-rows pb-rows-flat">
            {moved.map((row) => {
              const at = Math.max(-1, stages.findIndex((s) => s.toLowerCase() === String(row.stage ?? '').toLowerCase()))
              return (
                <div className="pb-person-deal pb-moved" key={row.id}>
                  <div><b>{row.name}</b><div className="pb-sub">{firstName(row.owner)}</div></div>
                  <span>{teamsDay ? (row.movedSays ?? '') : (row.theirRead?.words ?? row.said ?? '')}</span>
                  <div className="pb-track" aria-label={`${row.name}: ${row.stage ?? 'no stage yet'}`}>
                    {stages.map((s, i) => (
                      <span key={s} className="pb-track-step">
                        <span className={`pb-dot ${i <= at ? (row.mark === 'proven' ? 'pb-dot-proof' : 'pb-dot-said') : 'pb-dot-said pb-dot-ahead'}`} />
                        <span className="pb-track-name">{s}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* team-report.jpg says "did" for one sales team; salesorg-team-report.jpg, a sales organisation of more than ten people, says "said", as every other kind does. */}
      <Section heading={isSales && counting.length <= 10 ? 'What each person did' : 'What each person said'}>
        <div className="pb-rows pb-rows-flat">
          {((rep.whatEachPersonSaid ?? []) as Any[]).map((p) => (
            <div className="pb-row pb-row-person-did" key={p.who}>
              {/* team-report.jpg: a short summary, and each person opens to what they said in their own words. */}
              {teamsDay
                ? <button type="button" className="gwui-plain-link pb-person-open" aria-expanded={opened === p.who} onClick={() => setOpened(opened === p.who ? null : p.who)}><b>{p.isYou ? 'You' : firstName(p.who)}</b></button>
                : <b>{p.isYou ? 'You' : firstName(p.who)}</b>}
              {/* Quality pass, 18 October, T-6 and T-7: the server's summary in the third person, marked as the legend below says. */}
              <span>
                {teamsDay && p.mark && <span className={`pb-dot ${p.mark === 'proven' ? 'pb-dot-proof' : 'pb-dot-said'} pb-dot-inline`} role="img" aria-label={p.mark === 'proven' ? 'Proven' : 'Only someone’s word'} />}
                {teamsDay ? (p.inShort ?? (p.lines ?? [])[0] ?? '') : (p.lines ?? []).join(' ')}
              </span>
              {(() => {
                const will = teamsDay && typeof p.willDo === 'string' && p.willDo ? p.willDo : willDo(p.who)
                return will ? <span><span className="pb-sub">Will do:</span> {will}</span> : <span className="pb-sub">Will do: did not say</span>
              })()}
              {/* "That's not right" on their own line, or on any line for whoever runs the check-in (the server decides what reaches the check). */}
              {(p.isYou || (!!me?.id && ground?.initiatorId === me.id)) && <ThatsNotRight line={(p.lines ?? []).join(' ') || p.inShort || ''} />}
            </div>
          ))}
        </div>
        <p className="pb-foot">Short summaries. Open a person to see what they said, in their own words.</p>
        {teamsDay && opened && ((rep.whatEachPersonSaid ?? []) as Any[]).filter((p) => p.who === opened).map((p) => (
          <Panel key={p.who}>
            <h3 className="pb-card-h">{`${p.isYou ? 'You' : firstName(p.who)}, in ${p.isYou ? 'your' : 'their'} own words`}</h3>
            {((p.lines ?? []) as string[]).map((l, i) => <p className="gwui-panel-text" key={i}>{`“${l}”`}</p>)}
          </Panel>
        ))}
        <div className="pb-legend">
          <span><span className="pb-dot pb-dot-proof" /> Proven</span>
          <span><span className="pb-dot pb-dot-proof" /> Confirmed by the person who received it</span>
          <span><span className="pb-dot pb-dot-said" /> Only someone’s word</span>
          <span><span className="pb-dot pb-dot-said pb-dot-ahead" /> From memory only</span>
        </div>
      </Section>

      </>)}

      <Link to={`/grounds/${groundId}?tab=report`} className="pb-wide-btn">Every session</Link>

      {/* sales-team-report.txt: the closing line, how sure Groundwork is about this report (T-12). */}
      {teamsDay?.howSure && <p className="pb-how-sure">{teamsDay.howSure}</p>}

      <div className="pb-whole-board-link">
        <Link to={`/grounds/${groundId}/session/${sessionNumber}?whole=1`} className="gwui-plain-link">See every other part of this report</Link>
      </div>
    </Page>
  )
}

/**
 * THE TEAM'S REPORT BEFORE THE LEAD HAS SHARED IT, AS A PERSON WHO CHECKS IN READS IT (team-report-as-participant.jpg).
 * Nothing of the team's report is shown until the lead shares it: only when it last changed, that the lead has not
 * shared it yet, and the way to the reader's own report, which is theirs already. The lead's own question is the lead's
 * to answer, so it is not offered here.
 */
export function TheTeamReportIsNotSharedYet({ groundId, sessionNumber, ground }: { groundId: string; sessionNumber: number; ground: Any }) {
  /* The direct morning (lib/the-direct-morning.tsx), as for the report itself. */
  const direct = useTheDirectMorning() || isTheDirectMorningOn(ground)
  const me = useAuthStore((st) => st.user)
  const label = ground?.label ?? 'This check-in'
  const parties: Any[] = ground?.participants ?? []
  const lead = parties.find((p) => p.partyType === 'INITIATOR')
  const leadFirst = firstName(lead?.user?.firstName ?? ground?.leadFirstName) || 'The person who runs it'
  const mine = parties.find((p) => p.userId === me?.id)
  const done = ((ground?.checkIns ?? []) as Any[]).filter((c) => c.sessionNumber === sessionNumber && c.completedAt)
  const lastIn = [...done].sort((a, c) => String(c.completedAt).localeCompare(String(a.completedAt)))[0] ?? null
  const lastInName = lastIn ? firstName(parties.find((p) => p.id === lastIn.participantId)?.user?.firstName) : ''
  const myCheckIn = done.find((c) => c.participantId === mine?.id) ?? null
  /* When it will reach them, in the server's words (Hafsah's answers 1 and 5): it shares itself at its set time unless the lead holds it. */
  const { data: sharing } = useQuery({ queryKey: ['report-sharing', groundId], queryFn: () => reportsApi.sharing(groundId), retry: false, staleTime: 30_000 })
  return (
    <Page>
      <PageTitle crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label, to: `/grounds/${groundId}/board` }]} title="The team’s report isn’t shared yet" />
      {lastIn && (
        <p className="pb-updated">{`Last updated on ${aDay(lastIn.completedAt)} at ${aTime(lastIn.completedAt)}${lastInName ? `, when ${lastInName === firstName(me?.firstName) ? 'you' : lastInName} checked in` : ''}.${direct ? '' : ' It only changes when something new comes in, such as a check-in, a document or a number from another system.'}`}</p>
      )}
      <Panel>
        <p className="gwui-panel-text">{sharing?.says ?? `${leadFirst} has not shared it yet. You’ll get an email when ${leadFirst} does.`}</p>
        {myCheckIn?.id
          ? <div><Button kind="primary" to={`/checkin/${myCheckIn.id}/report`}>Read your own report</Button></div>
          : <p className="gwui-panel-text">Your own report is written once you have checked in.</p>}
      </Panel>
    </Page>
  )
}
