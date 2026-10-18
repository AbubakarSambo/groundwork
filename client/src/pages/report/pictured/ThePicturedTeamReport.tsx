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
const aDay = (at: string | Date) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).format(new Date(at))
const aTime = (at: string | Date) => new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos' }).format(new Date(at)).replace(':00', '').replace(/\s/g, '').toLowerCase()
const isoDay = (at: string | Date) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(at))
const listed = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? '')
const RELY: Record<string, string> = { thin: 'low', partial: 'medium', solid: 'high' }
const theNoFor = (yes: string) => (/^Yes, it /.test(yes) ? 'No, it doesn’t' : 'No')

export function ThePicturedTeamReport({ groundId, sessionNumber, ground }: { groundId: string; sessionNumber: number; ground: Any }) {
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board', groundId] }); toast.success('This is now in how we work.') },
    onError: () => toast.error('That did not save. Nothing has changed, so try again.'),
  })
  const rep: Any = r
  const b: Any = board
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
  const moved: Any[] = day ? (grid?.rows ?? []).filter((row: Any) => row.kind !== 'county' && row.lastSaidOn === day) : []
  const isSales = isASalesKind(b?.kindOfWork ?? ground?.kindOfWork)
  /* kwame-team-report.jpg: a check-in about one new person is named by that person and the session. */
  const onboardingSubject = b?.family === 'ONBOARDING' ? firstName(((b?.participants ?? []) as Any[]).find((p) => p.partyType !== 'INITIATOR' && !p.managingOnly)?.name) : ''

  /* What each person said they would do this session, from the board's own lines. */
  const willDo = (who: string): string | null => {
    const row = (b?.whoOwnsWhat ?? []).find((w: Any) => w.name === who)
    const it = (row?.items ?? []).find((i: Any) => i.type === 'COMMITMENT' && i.sessionNumber === sessionNumber)
    return it ? String(it.text).replace(/^[^"“]*?said,\s*/i, '').replace(/^["“]|["”]$/g, '') : null
  }
  const differences: Any[] = rep.whereThingsStand?.openWithReasons ?? []
  const question: Any = (b?.decisions ?? []).find((d: Any) => (d.action?.choices ?? []).length && (d.action.choices as Any[]).every((c: Any) => !c.route || String(c.route.path ?? '').startsWith(`/grounds/${groundId}/`)))

  /* faith90-team-report.jpg: before anybody has checked in there is no team report yet, and the page says when there will be. */
  if (counting.length && !answered.length) {
    return (
      <Page>
        {/* faith90-team-report.jpg: the check-in's own header as the board draws it, "Your check-in" and the tabs, above the first report's note. */}
        <TheCheckInsOwnHeader groundId={groundId} ground={ground} sessionNumber={sessionNumber} label={label} />
        {lastIn && (
          <p className="pb-updated">{`Last updated on ${aDay(lastIn.completedAt)} at ${aTime(lastIn.completedAt)}${lastInName ? `, when ${lastInName} checked in` : ''}. It only changes when something new comes in, such as a check-in, a document or a number from another system.`}</p>
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
        title={onboardingSubject ? `${onboardingSubject}, session ${sessionNumber}` : rep.released ? `Session ${sessionNumber}` : sessionDay ? `The team’s report, ${aDay(sessionDay)}` : `The team’s report, session ${sessionNumber}`}
      />
      {/* team-report.jpg: when it last changed and who checked in on the left, "Yesterday" and "This week" as buttons on the right. */}
      <div className="pb-report-head">
        <div>
          {lastIn && (
            <p className="pb-updated">{`Last updated on ${aDay(lastIn.completedAt)} at ${aTime(lastIn.completedAt)}${lastInName ? `, when ${lastInName} checked in` : ''}. It only changes when something new comes in, such as a check-in, a document or a number from another system.`}</p>
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

      {/* team-report.jpg: "In short" is the report's own few sentences on the page, not in a box. */}
      <Section heading="In short">
        {((rep.pictureLines ?? []) as string[]).length
          ? <div className="pb-in-short">{(rep.pictureLines as string[]).map((l) => <p className="pb-read" key={l}>{l}</p>)}</div>
          : <p className="gwui-panel-text">{rep.finding?.text ?? 'Nothing is written for this session yet.'}</p>}
      </Section>

      {moved.length > 0 && (
        <Section heading="What moved" note="Ringed is someone’s word; filled is proven">
          <div className="pb-rows pb-rows-flat">
            {moved.map((row) => {
              const at = Math.max(-1, stages.findIndex((s) => s.toLowerCase() === String(row.stage ?? '').toLowerCase()))
              return (
                <div className="pb-person-deal pb-moved" key={row.id}>
                  <div><b>{row.name}</b><div className="pb-sub">{firstName(row.owner)}</div></div>
                  <span>{row.theirRead?.words ?? row.said ?? ''}</span>
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
              <b>{p.isYou ? 'You' : firstName(p.who)}</b>
              <span>{(p.lines ?? []).join(' ')}</span>
              {willDo(p.who) ? <span><span className="pb-sub">Will do:</span> {willDo(p.who)}</span> : <span className="pb-sub">Will do: did not say</span>}
            </div>
          ))}
        </div>
        <p className="pb-foot">Short summaries. Open a person to see what they said, in their own words.</p>
        <div className="pb-legend">
          <span><span className="pb-dot pb-dot-proof" /> Proven</span>
          <span><span className="pb-dot pb-dot-proof" /> Confirmed by the person who received it</span>
          <span><span className="pb-dot pb-dot-said" /> Only someone’s word</span>
          <span><span className="pb-dot pb-dot-said pb-dot-ahead" /> From memory only</span>
        </div>
      </Section>

      {differences.length > 0 && (
        <Section heading="Where people see it differently">
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

      {/* team-report.jpg: the lead's own question, in a dark-edged box with the heading inside it. The other check-ins' team
          reports have no question to answer and no such section; the conversation worth having is on "?whole=1". */}
      {question && (
        <div className="pb-question">
          <h3 className="pb-box-h">One question to answer</h3>
          <p className="pb-read">{question.question}</p>
          {question.why && <p className="gwui-panel-text">{question.why}</p>}
          <div className="pb-relevant-actions">
            {(question.action.choices as Any[]).filter((c) => c.route).map((c, i) => (
              <Button key={c.label} kind={i === 0 ? 'primary' : 'secondary'} disabled={answer.isPending} onClick={() => answer.mutate(c.route)}>{/^No$/.test(c.label) ? theNoFor((question.action.choices as Any[])[0].label) : c.label}</Button>
            ))}
          </div>
          <p className="pb-foot">Your answer updates the board, and everyone counts the same way from now on.</p>
        </div>
      )}

      <Link to={`/grounds/${groundId}?tab=report`} className="pb-wide-btn">Every session</Link>

      {/* team-report.jpg: below "Every session", what was asked and not answered yet, and what happens next. Served to whoever runs the check-in only (what-i-dont-know-yet.ts). */}
      {Array.isArray(rep.whatIDontKnowYet) && (
        <Panel className="pb-unknowns">
          <h3 className="pb-box-h">What I don’t know yet</h3>
          <p className="pb-sub pb-unknowns-note">Things Groundwork can’t tell from what it has, and what it will ask next.</p>
          {(rep.whatIDontKnowYet as Any[]).length
            ? (rep.whatIDontKnowYet as Any[]).map((x, i) => (
              <div className="pb-unknown" key={i}>
                <p className="pb-card-h">{x.title}</p>
                <p className="pb-sub">{x.says}</p>
              </div>
            ))
            : <p className="gwui-panel-text">Nothing Groundwork asked for in this check-in is still waiting for an answer.</p>}
        </Panel>
      )}

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
        <p className="pb-updated">{`Last updated on ${aDay(lastIn.completedAt)} at ${aTime(lastIn.completedAt)}${lastInName ? `, when ${lastInName === firstName(me?.firstName) ? 'you' : lastInName} checked in` : ''}. It only changes when something new comes in, such as a check-in, a document or a number from another system.`}</p>
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
