import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Section, Panel, EdgeList, EdgeRow } from '@/components/gw/ui'

/**
 * RELEASE 8: THE SECTIONS A SITUATION'S BOARD DRAWS THAT NO KIT PICTURE DRAWS ON ITS OWN (api/src/modules/board/release-8-situations.ts).
 * Each draws only what the server already served this reader, under the heading and the reason the server sent, and nothing where it
 * sent nothing. The other sections of a situation's board (what was agreed at the start, each account side by side, what is known, the
 * change since last check-in, blockers, what keeps coming up) are the board's own, drawn as they are everywhere else.
 */
type Any = any

export type ASituationKey =
  | 'targets' | 'plan' | 'grid' | 'start' | 'accounts' | 'picture' | 'timeline' | 'themes' | 'oblig'
  | 'change' | 'blockers' | 'risks' | 'patterns' | 'lead' | 'grades'

/** Each situation section, as the pictured board's own section it is drawn by. */
export const SITUATION_TO_PICTURED: Record<ASituationKey, string> = {
  lead: 'needsYou', targets: 'headlineTargets', start: 'agreedAtTheStart', accounts: 'accounts', picture: 'knownBelievedUnknown',
  themes: 'situationThemes', oblig: 'obligations', timeline: 'situationTimeline', change: 'changeSinceLast', grid: 'everySale',
  plan: 'situationPlan', blockers: 'blockers', risks: 'risks', patterns: 'patterns', grades: 'whoCheckedIn',
}

/** The order a situation's board is drawn in: the situation's own sections, then where this is heading, Ask, and what Groundwork recommends. */
export function theSituationsOrder(situation: Any, runsIt: boolean): string[] {
  const own = ((situation?.sections ?? []) as Any[]).filter((s) => runsIt || s.key !== 'lead').map((s) => SITUATION_TO_PICTURED[s.key as ASituationKey]).filter(Boolean)
  return ['situationNote', ...own, ...(runsIt ? ['heading', 'ask', 'recommends'] : ['ask'])]
}

const headingOf = (b: Any, key: ASituationKey, fallback: string) =>
  ((b?.situation?.sections ?? []) as Any[]).find((s) => s.key === key)?.heading ?? fallback
const whyOf = (b: Any, key: ASituationKey) =>
  ((b?.situation?.sections ?? []) as Any[]).find((s) => s.key === key)?.why ?? undefined

const dayAndMonth = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : whenItWas(d, 'dayAndMonthLong', 'UTC')
}

/** The one line above a situation's board: empty while nothing is clear, and what is still to come once something is. */
export function TheSituationsNote({ b }: { b: Any }) {
  const s = b?.situation
  const says = s?.empty ?? s?.stillToCome ?? null
  if (!says) return null
  return s.empty ? <Panel><p className="gwui-panel-text">{says}</p></Panel> : <p className="t-small">{says}</p>
}

export function WhatEachSidePromised({ b }: { b: Any }) {
  const sides: Any[] = b?.obligations ?? []
  if (!sides.length) return null
  return (
    <Section heading={headingOf(b, 'oblig', 'What each side promised')} note={whyOf(b, 'oblig')}>
      <div className="g2">
        {sides.map((side, i) => (
          <Panel key={side.participantId ?? `${side.who}-${i}`}>
            <h3 className="t-h3">{side.who}</h3>
            {(side.promised ?? []).map((p: string, j: number) => <p className="gwui-panel-text" key={`p${j}`}>{p}</p>)}
            {(side.othersWaitFor ?? []).map((p: string, j: number) => <p className="gwui-panel-text" key={`w${j}`}>{p}</p>)}
          </Panel>
        ))}
      </div>
    </Section>
  )
}

export function TheRisks({ b }: { b: Any }) {
  const risks: Any[] = b?.risks ?? []
  if (!risks.length) return null
  return (
    <Section heading={headingOf(b, 'risks', 'Risks')} note={whyOf(b, 'risks')}>
      <EdgeList label="Risks">
        {risks.map((r) => <EdgeRow key={r.id} kind="concern" title={r.says} detail={r.because} />)}
      </EdgeList>
    </Section>
  )
}

export function WhatHappenedDayByDay({ b }: { b: Any }) {
  const events: Any[] = b?.timeline ?? []
  if (!events.length) return null
  return (
    <Section heading={headingOf(b, 'timeline', 'What happened, day by day')} note={whyOf(b, 'timeline')}>
      <EdgeList label="What happened, day by day">
        {events.map((e, i) => <EdgeRow key={`${e.on}-${i}`} kind="look" reason={null} title={dayAndMonth(e.on)} detail={e.says} />)}
      </EdgeList>
    </Section>
  )
}

export function WhatKeepsBeingRaised({ b }: { b: Any }) {
  const room = b?.whatTheRoomIsAbout
  const aims: string[] = ((room?.aims ?? []) as Any[]).map((a) => String(a?.aim ?? a?.text ?? '').trim()).filter(Boolean)
  const things: string[] = ((room?.things ?? []) as Any[]).map((t) => String(t?.name ?? '').trim()).filter(Boolean)
  const apart: Any[] = (b?.divergence?.items ?? []).filter((d: Any) => String(d?.topic ?? d?.summary ?? '').trim())
  if (!aims.length && !things.length && !apart.length) return null
  return (
    <Section heading={headingOf(b, 'themes', 'What keeps being raised')} note={whyOf(b, 'themes')}>
      <EdgeList label="What keeps being raised">
        {aims.map((a, i) => <EdgeRow key={`a${i}`} kind="look" reason={null} title={a} />)}
        {apart.map((d, i) => <EdgeRow key={`d${i}`} kind="decide" reason="People see this differently." title={String(d.topic ?? d.summary)} detail={d.centralQuestion ?? undefined} />)}
        {things.length > 0 && <EdgeRow kind="look" reason={null} title={`People named ${things.length === 1 ? things[0] : `${things.slice(0, -1).join(', ')} and ${things[things.length - 1]}`}.`} />}
      </EdgeList>
    </Section>
  )
}

const PLAN_TAG: Record<string, string> = { done: 'Done.', 'not done': 'Not done.', dropped: 'Dropped.', open: '' }

export function TheSituationsWorkPlan({ b }: { b: Any }) {
  const rows: Any[] = b?.workPlan ?? []
  if (!rows.length) return null
  return (
    <Section heading={headingOf(b, 'plan', 'Work plan')} note={whyOf(b, 'plan')}>
      <EdgeList label="Work plan">
        {rows.map((r) => <EdgeRow key={r.id} kind={r.state === 'not done' ? 'concern' : r.state === 'done' ? 'ready' : 'look'} reason={PLAN_TAG[r.state] || null} title={r.who ?? 'Someone'} detail={r.says} />)}
      </EdgeList>
    </Section>
  )
}
