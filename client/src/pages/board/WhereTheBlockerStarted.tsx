import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { groundsApi } from '@/api/grounds'
import { boardApi } from '@/api/board'
import { useAuthStore } from '@/stores/auth'
import { Page, Panel, Button, CheckInHeader } from '@/components/gw/ui'
import { theScheduleInWords } from './pictured/ThePicturedSalesBoard'
import { phaseSpineSentence } from '@/lib/phase-spine-sentence'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { theContextTabsName } from '@/lib/the-references-tab'
import { TheOtherBoardsYouAreIn } from '@/components/gw/TheOtherBoardsYouAreIn'
import './pictured/pictured-board.css'

/**
 * WHERE THE BLOCKER STARTED (screen match, 16 October; where-a-blocker-started.jpg, "#/c/sales/trace",
 * opened from "See where it started" under "Waiting on other teams").
 *
 * The chain is the engine's (`GET /grounds/:id/blocker-trace`, the-blocker-trace.service.ts): each step
 * through the check-ins it touches, only through check-ins this reader may open, with where it started,
 * the decision it needs and who decides. Nothing is worked out here. Where a step is in a check-in the
 * reader may not open, the engine leaves it out and says which team it waits on instead.
 */
type Any = any

interface AStep { kind: string; checkIn: string; checkInId: string; owner: string | null; text: string }
interface ATrace { id: string; steps: AStep[]; whereItStarted: string | null; decisionNeeded: string | null; decidedBy: string | null; waitingOn: string | null }

const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || ''

export function WhereTheBlockerStarted() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { data } = useQuery({
    queryKey: ['blocker-trace', id],
    queryFn: () => apiClient.get(`/grounds/${id}/blocker-trace`).then((r) => (r.data?.data ?? r.data) as { traces: ATrace[] }),
    enabled: !!id,
    retry: false,
  })
  const { data: ground } = useQuery({ queryKey: ['ground', id], queryFn: () => groundsApi.get(id!), enabled: !!id })
  const { data: board } = useQuery({ queryKey: ['board', id], queryFn: () => boardApi.get(id!), enabled: !!id })
  const g: Any = ground
  const b: Any = board
  const runsIt = !!user?.id && g?.initiatorId === user.id
  const isAParty = !!(g?.participants ?? []).some((p: Any) => p.userId === user?.id)
  const myWork = runsIt ? 'sessions' : 'record'
  const title = g?.label ?? b?.title ?? 'This check-in'
  const tabs = [
    { key: 'board', label: 'Board', to: `/grounds/${id}/board` },
    ...(runsIt || isAParty ? [{ key: 'chat', label: 'Check-in', to: `/grounds/${id}` }] : []),
    { key: 'context', label: theContextTabsName(g, 'Context and resources'), to: `/grounds/${id}?tab=context` },
    ...(runsIt || isAParty ? [{ key: myWork, label: 'My work', to: `/grounds/${id}?tab=${myWork}` }] : []),
    { key: 'settings', label: 'People and setup', to: `/grounds/${id}?tab=settings` },
  ]
  const schedule = [
    theScheduleInWords(g?.cadence, g?.workingDays, b?.phaseSpine?.sessions?.[b.phaseSpine.sessions.length - 1]?.opensOn ?? null),
    phaseSpineSentence(b?.phaseSpine?.currentSession ? { startsAt: null, endsAt: b.phaseSpine.endsAt ?? null, currentSession: b.phaseSpine.currentSession } : null, plannedSessionsFor(g?.timelineDays, g?.cadence, g?.plannedSessions) ?? null),
  ].filter(Boolean).join(' ')
  const traces = data?.traces ?? []
  return (
    <Page>
      <CheckInHeader
        crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label: title }]}
        title={title}
        subtitle={schedule || undefined}
        action={(runsIt || isAParty) ? <Button kind="primary" to={`/grounds/${id}`}>{runsIt ? 'Your check-in' : 'Start my check-in'}</Button> : undefined}
        active="board"
        tabs={tabs}
        trailing={<TheOtherBoardsYouAreIn groundId={id!} label="Views" plain />}
      />
      <h2 className="pb-trace-title">Where the blocker started</h2>
      <p className="pb-trace-intro">A blocker in one check-in can point at another team. Groundwork follows it back through each check-in it touches.</p>
      {!data ? null : traces.length === 0 ? (
        <Panel><p className="gwui-panel-text">Nothing on record follows a blocker here back to another team yet. When a wait on another team is traced, each step shows here.</p></Panel>
      ) : traces.map((t) => {
        const asker = t.steps.find((s) => s.owner && s.checkInId === id)?.owner ?? null
        return (
          <div className="pb-trace" key={t.id}>
            <div className="pb-rows">
              {t.steps.map((s, i) => (
                <div className="pb-row pb-trace-row" key={i}>
                  <b>{s.kind}</b>
                  <span className="pb-dot pb-dot-said" />
                  <span>
                    <span className="pb-trace-text">{s.text}</span>
                    <span className="pb-deal-sub" style={{ display: 'block' }}>{s.checkInId === id ? s.checkIn : <Link to={`/grounds/${s.checkInId}/board`}>{s.checkIn}</Link>}</span>
                  </span>
                  <span>{s.owner ?? ''}</span>
                </div>
              ))}
            </div>
            {t.waitingOn && <p className="gwui-panel-text">{t.waitingOn}</p>}
            {t.whereItStarted && <p className="gwui-panel-text"><b>Where it started:</b> {t.whereItStarted}</p>}
            {t.decisionNeeded && (
              <Panel>
                <div className="pb-trace-decision">
                  <div>
                    <p className="pb-card-h">{`Decision needed: ${t.decisionNeeded}`}</p>
                    {t.decidedBy && <p className="gwui-panel-text">{t.decidedBy}</p>}
                  </div>
                  {asker && <Button kind="secondary" to={`/grounds/${id}?tab=context`}>{`Ask ${firstName(asker)}`}</Button>}
                </div>
              </Panel>
            )}
          </div>
        )
      })}
    </Page>
  )
}
