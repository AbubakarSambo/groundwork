import { whoHasAnsweredOnTheBoard } from '@/lib/the-one-count'
import { useACheckInTakes } from '@/lib/how-long-setup-takes'
import { AddToTheProject } from './AddToTheProject'
import { EveryTraderAndWhatShowsIt } from './TheLoansBoard'
import { EveryTicketAndWhatShowsIt, EachAreaOfTheWork, theIncidentsBySiteAndType, isATicketsKind, theTicketGrid } from './TheTicketsBoard'
import { WomenAndDropOff } from './TheProgrammeBoard'
import { WhereNextRanked } from './TheWhereNextBoard'
import { TheSituationsNote, WhatEachSidePromised, TheRisks, WhatHappenedDayByDay, WhatKeepsBeingRaised, TheSituationsWorkPlan, EachAccountSideBySide, KnownBelievedUnknown, ForYouToDecide, whoAnsweredThisRound } from './TheSituationsSections'
import { useMemo, useState, type ReactNode } from 'react'
import { WhatIsClosing } from './TheMorningOnTheBoard'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Section, Panel, Tag, Button, EdgeList, EdgeRow, Table, OnAPhoneShowFirst } from '@/components/gw/ui'
import { apiClient } from '@/api/client'
import { toast } from 'sonner'
import { reportsApi } from '@/api/reports'
import { EvidenceIndexSection, BusyOrMovingSection, ContradictionsSection, QuestionsForTheLeadSection, WhereTheCohortStandsSection, SupportGivenSection, ByWhoTheyAreSection, WhereTheyDisagreeSection, WhatTheSystemsShowSection, WhereWhatWasSaidAndTheSystemsDifferSection, WhereTheMatterStandsSection, TheOpeningSentences, WhatYouNeedToDecideSection, WhatChangedThisWeekSection, WhatEachLevelUnderstoodSection, WhatTheVisitLogShowsSection, TheCountiesSection, TheBoardsOwnReadSection } from '../TheSwitchboardsSections'
import { aRealOrganisationName } from '@/lib/ask-name'
import { groundsApi } from '@/api/grounds'
import { isASalesKind } from '@/lib/a-sales-kind'
import { companyApi } from '@/api/company'
import { useAuthStore } from '@/stores/auth'
import { useAskStore } from '@/stores/ask'
import { howARowReads, isFinished, type ListRow } from '@/pages/grounds/how-a-row-reads'
import {
  HeadlineAndGap, WhatTheTargetAssumes, WhatNeedsYou, EveryDealDayByDay, TheTeamToday, Blockers, WhatKeepsComingUp,
  ReportedAgainstCriteria, WhoCheckedIn, TheOpenDeal, Reports, HelpNobodyMentioned, WaitingOnOtherTeams, OpenIssues, WhereThisIsHeading,
  GroundworkRecommends, dealsByGroup, isoDay, type PicturedBoardProps,
} from './ThePicturedSalesBoard'
import { SuggestionsForTheLead } from '@/components/gw/Suggestions'
import './pictured-board.css'
import { TheBar, THE_LEGEND, CORRECT_IT_HERE } from './TheBar'
import { theMetricRows, theMetricsPeopleSaid } from './TheMetricsBoard'
import { SaidVersusDone, TheFoundersFigures } from './TheFounderBoard'

/**
 * ANY BOARD AS PICTURED, SECTION BY SECTION, IN THE ORDER IT IS GIVEN (screen match, 16 October;
 * docs/prototype/screens/B5-boards-every-check-in and B5-boards-every-situation). Each section is drawn
 * from the board the server already served this reader, and draws nothing where the server sent nothing
 * for it. Which sections a board has, and in which order, is decided by the caller (BoardPage), from the
 * kind of check-in and the switchboard; this file only knows how each one looks.
 */
type Any = any

export type APicturedSection =
  | 'lastSession' | 'headline' | 'closing' | 'assumes' | 'needsYou' | 'deals' | 'agreedAtTheStart' | 'changeSinceLast' | 'ninetyDays'
  | 'history' | 'bothSeeIt' | 'teamToday' | 'blockers' | 'patterns' | 'reported' | 'womenAndDropOff' | 'whoCheckedIn' | 'overTime' | 'reports'
  | 'everySession' | 'otherBoards' | 'help' | 'otherTeams' | 'openIssues' | 'heading' | 'recommends' | 'otherRecords' | 'kindOfWork' | 'yourTeam'
  | 'participantNote' | 'priorities' | 'yourPart' | 'teamReport' | 'companyBoard' | 'template'
  | 'plan' | 'money' | 'stakeholders' | 'projectComingUp' | 'offTrack'
  | 'readTop' | 'readEnd'
  | 'theDecision' | 'accounts' | 'knownBelievedUnknown' | 'forYouToDecide'
  | 'suggestion' | 'theCase'
  | 'fillsIn' | 'agreedAndApart' | 'firstSteps' | 'mayBeRelevant'
  | 'headlineTargets' | 'everySale' | 'byTeam' | 'themes' | 'saidVersusDone' | 'founderFigures'
  | 'cohortStands' | 'personPlaceOrModel' | 'supportGiven'
  | 'inShort' | 'byWhoTheyAre' | 'whereNextRanked' | 'whereTheyDisagree' | 'cantTellYou'
  | 'question' | 'systemsShow' | 'saidAndSystemsDiffer' | 'opening'
  | 'matterStands' | 'youNeedToDecide' | 'changedThisWeek'
  | 'eachLevel' | 'visitLog' | 'counties'
  | 'situationNote' | 'situationThemes' | 'obligations' | 'situationTimeline' | 'situationPlan' | 'risks'
  | 'whereTimeWent' | 'evidenceIndex' | 'busyOrMoving' | 'contradictions' | 'questionsForTheLead'

const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || ''

/* ------------------------------------------------------------------ the onboarding board's own */

/** "The last session is done. It’s yours to decide how this ends." (kwame-board.txt), to whoever runs it. */
function TheLastSessionIsDone({ b, groundId }: { b: Any; groundId: string }) {
  const spine = b.phaseSpine
  const planned = spine?.plannedSessions ?? null
  const sessions: Any[] = spine?.sessions ?? []
  const last = sessions[sessions.length - 1]
  if (!b.canEditFrame || !planned || !last || last.n < planned || last.state !== 'done') return null
  return (
    <Panel className="pb-panel-blue">
      <div className="pb-trace-decision">
        <div>
          <p className="pb-card-h">The last check-in is done</p>
          <p className="gwui-panel-text">It’s yours to decide how this ends.</p>
        </div>
        <Button kind="primary" to={`/grounds/${groundId}/end`}>Decide how it ends</Button>
      </div>
    </Panel>
  )
}

function WhatWasAgreedAtTheStart({ b }: { b: Any }) {
  const s = b.startingState
  if (typeof s === 'string' && s.trim()) return <Section heading="What was agreed at the start"><Panel><p className="gwui-panel-text">{s}</p></Panel></Section>
  if (!s || typeof s !== 'object') return null
  if (!(s.rows ?? []).length) {
    return <Section heading={s.heading ?? 'What was agreed at the start'}><Panel><p className="gwui-panel-text">{s.says ?? 'Nothing was agreed at the start yet.'}</p></Panel></Section>
  }
  return (
    /* kwame-board.jpg: "Confirmed by both on day 1", where the server says so. */
    <Section heading={s.heading ?? 'What was agreed at the start'} note={s.confirmed ?? undefined}>
      <div className="pb-cards3">
        {s.rows.map((r: Any, i: number) => (
          <Panel key={i}>
            <span className="pb-sub">{r.when}</span>
            <p className="pb-card-h">{r.what ?? r.says}</p>
          </Panel>
        ))}
      </div>
    </Section>
  )
}

const CHANGE_TAG: Record<string, { word: string; tone: 'proven' | 'plain' | 'concern' }> = {
  moved: { word: 'Moved', tone: 'proven' }, held: { word: 'Held', tone: 'plain' }, late: { word: 'Late', tone: 'concern' },
}

function ChangeSinceLastCheckIn({ b }: { b: Any }) {
  const c = b.changeSinceLast
  if (!c || !(c.rows ?? []).length) return null
  return (
    <Section heading={c.heading ?? 'Change since last check-in'} note={c.between}>
      <div className="pb-rows">
        {c.rows.map((r: Any, i: number) => (
          <div className="pb-row pb-row-change" key={i}>
            <b>{r.area}</b>
            <span>{r.says}</span>
            <span>{CHANGE_TAG[r.state] && <Tag tone={CHANGE_TAG[r.state].tone}>{CHANGE_TAG[r.state].word}</Tag>}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function TheNinetyDays({ b, groundId, seeTheSamePictures }: { b: Any; groundId: string; seeTheSamePictures: string | null }) {
  const n = b.ninetyDays
  if (!n || !(n.steps ?? []).length) return null
  const steps: Any[] = n.steps
  return (
    <Section heading={n.heading ?? 'The 90 days, in three steps'} note={seeTheSamePictures ?? undefined}>
      <div className="pb-cards">
        {steps.map((s: Any, i: number) => {
          const title = `After ${s.day} days: ${s.question.charAt(0).toLowerCase()}${s.question.slice(1)}`
          return i < steps.length - 1 ? (
            <details className="pb-fold" key={s.step}>
              <summary>{title}</summary>
              <p className="gwui-panel-text">{s.says}</p>
            </details>
          ) : (
            <div className="pb-fold pb-fold-last" key={s.step}>
              <b>{title}</b>
              <Button kind="secondary" size="small" to={`/grounds/${groundId}/end`}>Open it</Button>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/**
 * "HIS HISTORY, 12 WEEKS" as "Kwame’s history, 12 weeks" (people are named, never "his"): one line each for
 * the agreement, the commitments, the work, the proof, the feedback and the changes, from what the board serves.
 */
function TheirHistory({ b, personId }: { b: Any; personId: string | null }) {
  const h = (b.personHistory ?? []).find((x: Any) => x.participantId === personId) ?? null
  if (!h) return null
  const first = firstName(h.who)
  const weeks = (h.sessions ?? []).length
  const agreed = typeof b.startingState === 'object' && b.startingState ? (b.startingState.rows ?? []).filter((r: Any) => r.what).map((r: Any) => r.what) : []
  const items: Any[] = ((b.whoOwnsWhat ?? []).find((w: Any) => w.participantId === personId)?.items ?? [])
  const proven = items.filter((i) => i.mark === 'proven').length
  const commitments: string[] = (b.obligations ?? []).find((o: Any) => o.participantId === personId)?.promised ?? []
  const rows: [string, string][] = [
    ['Agreement', agreed.length ? agreed.join('; ') : ''],
    ['Commitments', h.says ?? ''],
    ['Work', items.filter((i) => i.type === 'PROGRESS').length ? `${items.filter((i) => i.type === 'PROGRESS').length} pieces of work on record.` : ''],
    ['Evidence', proven ? `${proven} backed by a document.` : ''],
    ['Open', commitments.length ? `${commitments.length} still open.` : ''],
  ].filter(([, v]) => !!v) as [string, string][]
  return (
    <Section heading={`${first}’s history, ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`} note="Agreement, commitments, work, evidence, feedback, changes">
      <Panel>
        {rows.map(([k, v]) => <div className="pb-kv" key={k}><b>{k}</b><span>{v}</span></div>)}
      </Panel>
    </Section>
  )
}

function WhereYouBothSeeItDifferently({ b, groundId }: { b: Any; groundId: string }) {
  const items: Any[] = b.divergence?.items ?? []
  const first = items.find((d) => (d.positions ?? []).length >= 2)
  if (!first) return null
  return (
    <Section heading="Where you both see it differently">
      <Panel>
        <div className="pb-two">
          {first.positions.slice(0, 2).map((p: Any, i: number) => (
            <div key={i}>
              <h3 className="pb-small-h">{p.who === 'You' ? 'You' : firstName(p.who)}</h3>
              <p className="pb-read">{`“${p.view}”`}</p>
            </div>
          ))}
        </div>
      </Panel>
      <div style={{ textAlign: 'center' }}><Button kind="quiet" to={`/grounds/${groundId}?tab=report`}>Open accounts side by side</Button></div>
    </Section>
  )
}

/* ------------------------------------------------------------------ a person's own part (leadership-board.jpg) */

/** "You’re a participant here. Amani runs it; you see the shared picture and your own part in full." */
function YouAreAParticipantHere({ leadFirstName }: { leadFirstName: string | null }) {
  void leadFirstName
  return null
}

/** The organisation's priorities, each with how it is going, as the Company page reads them to this reader. */
function ThePrioritiesThisQuarter() {
  const { data } = useQuery({ queryKey: ['company'], queryFn: companyApi.get, staleTime: 60_000, retry: false })
  const priorities: Any[] = (data as Any)?.priorities ?? []
  if (!priorities.length) return null
  return (
    <Section heading="The priorities this quarter">
      <div className="pb-cards3">
        {priorities.map((p) => {
          const tag = p.reading?.tag ?? p.tag
          const tone = /risk/i.test(tag ?? '') ? 'concern' : 'attention'
          return (
            <Panel key={p.id}>
              <div className="pb-card-top">
                <span className="pb-sub">{`Priority ${p.number}`}</span>
                {tag && <Tag tone={tone as Any}>{tag}</Tag>}
              </div>
              <p className="pb-card-h" style={{ marginTop: 10 }}>{p.title}</p>
              {/* The roll-up: which teams' check-ins feed this priority, and how it is going, as the Company page says them. */}
              {p.reading?.says && <p className="t-small gw-mt-4">{p.reading.says}</p>}
              {p.fedBy && <p className="t-tiny mut gw-mt-4">{p.fedBy}</p>}
            </Panel>
          )
        })}
      </div>
    </Section>
  )
}

/** "Your part": what this reader said they would do here, by when, still open. */
function YourPart({ b }: { b: Any }) {
  const mine: Any[] = (b.workPlan ?? []).filter((w: Any) => w.participantId === b.myParticipantId && w.state !== 'done')
  if (!mine.length) return null
  const theWords = (says: string) => (says.match(/said, "([^"]+)"/)?.[1] ?? says).replace(/[.!?]+$/, '')
  return (
    <Section heading="Your part">
      <div className="pb-rows pb-rows-flat">
        {mine.map((w) => (
          <div className="pb-row pb-row-part" key={w.id}>
            <b>{theWords(w.says)}</b>
            <span>{w.when ? w.when.charAt(0).toUpperCase() + w.when.slice(1) : ''}</span>
            <span>{/\btoday\b/i.test(w.when ?? '') ? <Tag tone="action">Due today</Tag> : <Tag tone="plain">Open</Tag>}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

/** The team's report, once the lead has shared it: "Last Wednesday’s, shared by Amani." */
function TheTeamsReport({ b, groundId, sessionRows, leadFirstName, heading }: { b: Any; groundId: string; sessionRows: Any[]; leadFirstName: string | null; heading: string }) {
  const shared = sessionRows.find((r) => r.shared)
  if (!shared && !b.teamPicture) return null
  const day = shared?.opened ? new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date(shared.opened)) : null
  return (
    <Section heading={heading}>
      <Panel>
        <div className="pb-trace-decision">
          <p className="gwui-panel-text">{shared ? `${day ? `Last ${day}’s` : 'The latest'}, shared by ${leadFirstName ?? 'the person who runs it'}.` : (b.teamPicture?.says ?? 'The team’s report is not shared yet.')}</p>
          {shared && <Button kind="secondary" to={`/grounds/${groundId}/session/${shared.sessionNumber}`}>Read it</Button>}
        </div>
      </Panel>
    </Section>
  )
}

/* ------------------------------------------------------------------ a decision worked through (supplier-board.jpg) */

/** "The decision": the question it is about, and how many have answered on their own so far. */
function TheDecision({ b }: { b: Any }) {
  const question = b.endState ?? b.divergence?.centralQuestion ?? null
  if (!question) return null
  const people: Any[] = (b.participants ?? []).filter((x: Any) => !x.managingOnly)
  const { answered } = whoAnsweredThisRound(b)
  const missing = people.filter((x) => !answered.has(x.id)).map((x) => (x.id === b.myParticipantId ? 'you' : firstName(x.name)))
  return (
    <Panel className="pb-panel-blue">
      <span className="pb-sub">The decision</span>
      <p className="pb-answer">{question}</p>
      <p className="gwui-panel-text">{`Each person answered on their own before any discussion. ${answered.size} of ${people.length} so far${missing.length ? `; ${missing.join(' and ')} ${missing.length === 1 && missing[0] !== 'you' ? 'hasn’t' : 'haven’t'} answered.` : '.'}`}</p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ the other boards you're in */

/** "The other boards you’re in" (kwame-board.txt): every other open check-in, with what it needs, as the check-ins list says it. */
export function TheOtherBoardsYouAreIn({ groundId }: { groundId: string }) {
  const me = useAuthStore((s) => s.user)
  const { data } = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list, staleTime: 30_000 })
  const now = useMemo(() => new Date(), [])
  const rows = ((data ?? []) as unknown as ListRow[]).filter((g) => g.id !== groundId && !isFinished(g))
  if (!rows.length) return null
  return (
    <Section heading="The other boards you’re in">
      <div className="pb-cards3">
        {rows.map((g) => {
          const reads = howARowReads(g, me?.id ?? null, now)
          return (
            <Link key={g.id} to={`/grounds/${g.id}/board`} className="panel pad pb-board-card">
              <b>{g.label}</b>
              <span>{reads.needs ? <Tag tone={reads.needs.tone}>{reads.needs.text}</Tag> : reads.stands ? <Tag tone="plain">{reads.stands}</Tag> : null}</span>
            </Link>
          )
        })}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ a suggestion about one person, and their case */

/**
 * GROUNDWORK'S SUGGESTION, AS PICTURED (danielpip-board.jpg). The card is the one the lead already reads
 * (SuggestionsForTheLead: served only to whoever runs the check-in, the verdict never sent). Under it, what
 * keeps coming up about the person's work, said as what they were told on their own board, and only where
 * the board says they saw it first: a pattern the lead reads only because a week went by is not said to
 * have been told to anybody.
 */
function TheSuggestion({ groundId }: { b: Any; groundId: string; personId: string | null }) {
  /* F5: the served pattern no longer carries a sentence about who sees it, so nothing here reads one. */
  return <div className="pb-suggestion"><SuggestionsForTheLead groundId={groundId} where="board" /></div>
}

/** "Open Daniel’s case": everything this board serves the lead about the one person, on their own page. */
function TheirCase({ b, groundId, personId }: { b: Any; groundId: string; personId: string | null }) {
  const person = (b.participants ?? []).find((x: Any) => x.id === personId)
  const first = firstName(person?.name)
  if (!person || !first) return null
  return (
    <Panel>
      <div className="pb-case">
        <Button kind="primary" to={`/grounds/${groundId}/person/${person.id}`}>{`Open ${first}’s case`}</Button>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ a sales check-in of many people in teams (salesorg-board.jpg) */

/** "The team is aiming for 100 sales." read as the thing counted, "Sales". */
export function whatATargetCounts(name: string): string {
  const m = String(name ?? '').match(/aiming (?:for|at) [\d,.]+%?\s+(.+?)\.?$/i)
  const t = (m ? m[1] : String(name ?? '')).replace(/\.$/, '').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
}

/** The question and where the team stands, beside each target and the board's own word for how it stands. */
/** A number with its unit, as support.jpg writes it: "91%", "9.5h", "KES 7.0 million". Release 4 serves the unit; without one, the number alone. */
function withItsUnit(n: number, unit: string | null | undefined): string {
  const v = Number(n).toLocaleString('en-GB')
  const u = String(unit ?? '').trim()
  if (!u) return v
  if (/^[A-Z]{3}\b/.test(u)) return `${u.slice(0, 3)} ${v}${u.slice(3)}`
  return /^[%a-z]{1,3}$/.test(u) ? `${v}${u}` : `${v} ${u}`
}

/** The prototype's colour for where a target stands (support.jpg, ops.jpg): met is green, over its limit or behind is red, close is amber. */
function aTargetsTone(word: string): 'proven' | 'concern' | 'attention' | 'plain' {
  const w = String(word).toLowerCase()
  if (/^(met|on time|within|on track)$/.test(w)) return 'proven'
  if (/^(over limit|behind|missed|late)$/.test(w)) return 'concern'
  if (/^(close|at risk)$/.test(w)) return 'attention'
  return 'plain'
}

function TheHeadlineAndEachTarget({ b, withoutTargets = false, withBar = false, barBesideEachTarget = false, aimBar = null }: { b: Any; withoutTargets?: boolean; withBar?: boolean; barBesideEachTarget?: boolean; aimBar?: { of: number; shown: number; said: number; label: string } | null }) {
  const h = b.headline
  const targets: Any[] = withoutTargets ? [] : (b.objectives ?? []).filter((o: Any) => !o.ownerParticipantId && o.target != null)
  if (!h && !targets.length) return null
  /* The headline's bar is the first target's count against its target (salesorg.jpg: "87 of the 100"). What the deals on record show with a
     document is filled; the rest of the count is somebody's word, ringed. Where the record holds no count, no bar is drawn. */
  const aim = withBar ? targets.find((o) => o.count != null && Number(o.target) > 0) ?? null : null
  const shown = aim?.fromTheDeals && aim.fromTheDeals.proven != null && Number(aim.fromTheDeals.sold) === Number(aim.count) ? Number(aim.fromTheDeals.proven) : 0
  const said = aim ? Math.max(0, Number(aim.count) - shown) : 0
  return (
    <div className="pb-head">
      <div>
        {h?.question && <p className="pb-q">{h.question}</p>}
        {h?.answer && <p className="pb-answer">{h.answer}</p>}
        {aimBar && <TheBar of={aimBar.of} shown={aimBar.shown} said={aimBar.shown ? 0 : aimBar.said} label={aimBar.label} />}
        {aim && (
          <>
            <TheBar of={Number(aim.target)} shown={shown} said={said} label={`${Number(aim.count).toLocaleString('en-GB')} of ${Number(aim.target).toLocaleString('en-GB')}${shown ? `, ${shown.toLocaleString('en-GB')} shown by a document` : ''}.`} />
            {said > 0 && <p className="pb-foot">{THE_LEGEND}</p>}
          </>
        )}
      </div>
      {targets.length > 0 && (
        <Panel>
          <h2 className="pb-gap-h">Where each target stands</h2>
          {targets.map((o) => (
            <div className="pb-target-row" key={o.id}>
              <div>
                <b>{whatATargetCounts(o.name)}</b>
                {/* A limit not to go over reads as the picture's "7 of ≤ 5"; Release 4 only, so every other board reads as before. */}
                <span className="pb-sub">{`${withItsUnit(o.count ?? 0, b.releaseFourTeams ? o.unit : null)} of ${b.releaseFourTeams && o.journey?.direction === 'down' ? '≤ ' : ''}${withItsUnit(o.target, b.releaseFourTeams ? o.unit : null)}`}</span>
                {/* A founder's money, runway and counts are their own words: each count against its target is one ringed bar, never filled by a word. */}
                {barBesideEachTarget && o.count != null && Number(o.target) > 0 && (
                  <span className="pb-target-bar"><TheBar form="stage" of={Number(o.target)} said={Number(o.count)} label={`${whatATargetCounts(o.name)}, ${Number(o.count).toLocaleString('en-GB')} of ${Number(o.target).toLocaleString('en-GB')}, said and not shown by a document`} /></span>
                )}
              </div>
              {o.stands?.word ? <Tag tone={aTargetsTone(o.stands.word)}>{o.stands.word}</Tag> : o.notSettled ? <Tag tone="plain">Not settled</Tag> : null}
              {/* Release 4: each person's own target of the same name, under the team's (the lead and an admin only; the server decides). */}
              {b.releaseFourTeams && (b.eachPersonsOwn ?? []).find((x: Any) => x.objectiveId === o.id) && (
                <ul className="pb-own-shares" aria-label={`Each person's own target for ${whatATargetCounts(o.name)}`}>
                  {(b.eachPersonsOwn as Any[]).find((x: Any) => x.objectiveId === o.id).people.map((p: Any) => (
                    <li key={p.participantId} className="t-small"><span>{firstName(p.name)}</span><span className="mut">{p.says}</span></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {/* Release 4: where the team's figure and the people's own do not add up, from the record only. */}
          {b.releaseFourTeams && (b.whyTheNumbersDoNotMatch ?? []).length > 0 && (
            <div className="pb-numbers-differ">
              <h3 className="t-h3">Why the numbers don’t match</h3>
              {(b.whyTheNumbersDoNotMatch as Any[]).map((w) => <p key={w.objectiveId} className="t-small">{w.says}</p>)}
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}

/** What each kind of work's table calls one piece of work and the person on it (salesorg, eng, support, ops and programme boards). */
const THE_TABLE: Record<string, { heading: string; item: string; who: string }> = {
  'sales team': { heading: 'Every sale, and what shows it', item: 'Deal', who: 'Rep' },
  'sales org': { heading: 'Every sale, and what shows it', item: 'Deal', who: 'Rep' },
  "founder's own check-in": { heading: 'Every item, and what shows it', item: 'Item', who: 'Whose' },
}

/** Every piece of work in one table, each with what shows it; select one for its detail. */
function EverySaleAndWhatShowsIt({ section, today, groundId, kindOfWork, me }: { section: Any; today: string; groundId: string; kindOfWork: string | null; me: string | null }) {
  const t = THE_TABLE[kindOfWork ?? ''] ?? { heading: 'Every piece of work, and what shows it', item: 'Work', who: 'Owner' }
  /* A work plan also lists each promise on its own; the table is the pieces of work, each with its stage (founder-board.jpg). */
  const rows: Any[] = (section.rows ?? []).filter((r: Any) => r.kind !== 'county' && (section.section !== 'Work plan' || !!r.stage))
  const [openId, setOpenId] = useState<string | null>(rows[0]?.id ?? null)
  const open = rows.find((r) => r.id === openId) ?? null
  if (!rows.length) return null
  return (
    <Section heading={t.heading} >
      <div className="pb-legend"><span><span className="pb-dot pb-dot-proof" /> Proof shows it</span><span><span className="pb-dot pb-dot-said" /> Someone said it</span></div>
      <div className="pb-rows pb-sale-table" role="table" aria-label="Every sale">
        <div className="pb-sale-row pb-sale-head" role="row"><span>{t.item}</span><span>{t.who}</span><span>Stage now</span><span>What shows it</span><span>Next</span></div>
        <OnAPhoneShowFirst items={rows} render={(r) => (
          <button type="button" role="row" key={r.id} className={`pb-sale-row${r.id === openId ? ' pb-sale-open' : ''}`} onClick={() => setOpenId(r.id)}>
            <span><b>{r.name}</b>{r.kind === 'deal' && !r.due && r.group !== 'won' && <span className="pb-sub">No date</span>}</span>
            <span>{me && r.ownerParticipantId === me ? 'You' : r.owner ? firstName(r.owner) : 'Nobody yet'}</span>
            <span><span className={`pb-dot ${r.mark === 'proven' ? 'pb-dot-proof' : 'pb-dot-said'}`} /> {r.stage ?? ''}</span>
            <span>{r.mark === 'proven' ? 'A document backs it' : `${firstName(r.saidBy ?? r.owner)} said it`}</span>
            <span className="pb-sale-next">{r.next ?? r.nextSays ?? ''}</span>
          </button>
        )} />
      </div>
      {open && <TheOpenDeal r={open} groupNote={null} today={today} groundId={groundId} onChange={null} />}
      {!open?.theirRead && <div style={{ textAlign: 'center' }}><Button kind="quiet" to={`/grounds/${groundId}`}>Not right? Tell the check-in</Button></div>}
      <p className="pb-foot">{CORRECT_IT_HERE}</p>
    </Section>
  )
}

/**
 * "VOLUME FROM THE HELPDESK, CAUSES FROM THE CHECK-INS" (support-board.jpg). The board's themes section: what the
 * helpdesk would count, and the causes people gave in their check-ins. Groundwork holds no helpdesk numbers yet, so
 * the board's own sentence says so, rather than any count.
 */
function VolumeAndCauses({ b, now }: { b: Any; now: Date }) {
  /* Ops: the incidents on record that say their site and their type, counted; nothing where none does. */
  const heat = b.kindOfWork === 'distribution operations' ? theIncidentsBySiteAndType(b, now) : []
  if (heat.length) return <Section heading="Incidents by site and type, last 8 weeks" note="The shape of the work"><Panel><IncidentsBySiteAndType rows={heat} /></Panel></Section>
  const t = (b.workRecords ?? []).find((x: Any) => x.section === 'Themes')
  if (!t) return null
  return (
    <Section heading={b.kindOfWork === 'support desk' ? 'Volume from the helpdesk, causes from the check-ins' : b.releaseFourTeams && b.kindOfWork === 'distribution operations' ? 'Incidents by site and type, last 8 weeks' : 'Themes'} note="The shape of the work">
      <Panel>
        {t.state === 'not-known' || !(t.rows ?? []).length
          ? <p className="gwui-panel-text">{t.why ?? 'Nothing is on record here yet.'}</p>
          : b.releaseFourTeams && (t.rows ?? []).some((r: Any) => r.fields?.site && r.fields?.type)
            ? <IncidentsBySiteAndType rows={t.rows ?? []} />
          : b.releaseFourTeams && (t.rows ?? []).some((r: Any) => typeof r.fields?.count === 'number')
            ? <TheVolumeAndItsCauses rows={t.rows ?? []} />
            : <OnAPhoneShowFirst items={t.rows ?? []} render={(r: Any) => <p className="gwui-panel-text" key={r.id}><b>{r.name}</b> {r.said ?? ''}</p>} />}
      </Panel>
    </Section>
  )
}

/**
 * RELEASE 4, support.jpg: the counts as tiles, each with where it comes from (proven where a system counts it), and the causes people
 * gave, each with how many and who said it. Every number and word is the row's own; nothing is worked out here.
 */
/** RELEASE 4, ops.jpg: incidents counted by site and type, a cell darker the more it repeats. Every number is the row's own. */
function IncidentsBySiteAndType({ rows }: { rows: Any[] }) {
  const sites = [...new Set(rows.map((r) => String(r.fields.site)))]
  const types = [...new Set(rows.map((r) => String(r.fields.type)))]
  const n = (s: string, ty: string) => rows.filter((r) => r.fields.site === s && r.fields.type === ty).reduce((a, r) => a + Number(r.fields.count ?? 0), 0)
  return (
    <div className="pb-heat-wrap">
      <table className="pb-heat">
        <thead><tr><th />{types.map((ty) => <th key={ty} scope="col">{ty}</th>)}</tr></thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s}><th scope="row">{s}</th>{types.map((ty) => { const c = n(s, ty); return <td key={ty} className={`pb-heat-${Math.min(3, c)}`}>{c}</td> })}</tr>
          ))}
        </tbody>
      </table>
      <p className="pb-foot">Darker cells repeat. A cell of 3 or more points to the site itself.</p>
    </div>
  )
}

function TheVolumeAndItsCauses({ rows }: { rows: Any[] }) {
  const counts = rows.filter((r) => typeof r.fields?.count === 'number' && !r.fields?.cause)
  const causes = rows.filter((r) => typeof r.fields?.count === 'number' && r.fields?.cause)
  const most = Math.max(1, ...causes.map((r) => r.fields.count))
  return (
    <div className="pb-volume">
      <div className="pb-volume-tiles">
        <OnAPhoneShowFirst items={counts} first={6} render={(r) => (
          <div key={r.id} className="pb-volume-tile">
            <b className="pb-volume-n">{Number(r.fields.count).toLocaleString('en-GB')}</b>
            <span>{r.name}</span>
            <span className="pb-sub"><span className={`pb-dot ${r.mark === 'proven' ? 'pb-dot-proof' : 'pb-dot-said'}`} /> {r.fields.from ?? ''}</span>
          </div>
        )} />
      </div>
      {causes.length > 0 && (
        <div className="pb-volume-causes">
          <p className="pb-card-h">Causes, from the check-ins</p>
          <OnAPhoneShowFirst items={causes} render={(r) => (
            <div key={r.id} className="pb-cause">
              <div className="pb-cause-top"><span>{r.name}</span><b>{r.fields.count}</b></div>
              <span className="pb-cause-bar" style={{ width: `${Math.round((r.fields.count / most) * 100)}%` }} />
              {r.said && <span className="pb-sub">{r.said}</span>}
            </div>
          )} />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ a cohort of people each with the same kind of work (loans-board.jpg) */


/** What keeps coming up, three check-ins in a row, under the cohort's own question. Whether it is about one person, a place or the model is for the lead to judge; the board does not label it. */
function OnePersonAPlaceOrTheModel({ b }: { b: Any }) {
  const all: Any[] = (b.patterns ?? []).filter((x: Any) => x.whatHappened)
  const nameOf = new Map<string, string>((b.participants ?? []).map((q: Any) => [q.id, firstName(q.name)]))
  if (!all.length) return null
  return (
    <Section heading="What keeps coming up">
      <Panel>
        {all.map((x) => (
          <div className="pb-kv" key={x.id}><b>{x.yours ? 'You' : nameOf.get(x.participantId) ?? ''}</b><span>{x.whatHappened}</span></div>
        ))}
      </Panel>
    </Section>
  )
}


/* ------------------------------------------------------------------ people asked once, each on their own (mvnext-board.jpg) */

/* The people the check-in counts and who of them answered: the one count's own (lib/the-one-count.ts), never worked out again from the grid. */
const answeredOf = (b: Any) => {
  const { counted, answered: who } = whoHasAnsweredOnTheBoard(b)
  const name = new Map<string, string>([...(b.checkInGrid?.rows ?? []), ...(b.participants ?? []).map((x: Any) => ({ participantId: x.id, name: x.name }))].map((r: Any) => [r.participantId, r.name]))
  const rows: Any[] = counted.map((id) => ({ participantId: id, name: name.get(id) ?? '' }))
  return { rows, answered: rows.filter((r) => who.has(r.participantId)) }
}

/** The report's own picture, and how many answered. */
function InShort({ b, groundId }: { b: Any; groundId: string }) {
  const { data } = useQuery({ queryKey: ['report', groundId], queryFn: () => reportsApi.get(groundId), retry: false })
  const { rows, answered } = answeredOf(b)
  const picture = (data as Any)?.sharedPicture ?? null
  return (
    <Section heading="In short">
      <Panel>
        <p className="pb-read">{picture ?? 'The report is not written yet.'}</p>
        {rows.length > 0 && <p className="gwui-panel-text">{`${answered.length} of ${rows.length} answered, each on their own, once.`}</p>}
      </Panel>
    </Section>
  )
}


/** What the answers cannot say: who has not answered, by name. */
function WhatThisCantTellYou({ b }: { b: Any }) {
  const { rows, answered } = answeredOf(b)
  const done = new Set(answered.map((r) => r.participantId))
  const missing = rows.filter((r) => !done.has(r.participantId))
  const names = missing.map((r) => firstName(r.name))
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
  /* Only who has not answered, and only when somebody has not: the rest was a disclaimer that said the same on every board. */
  if (!missing.length) return null
  return (
    <Section heading="What this can’t tell you">
      <Panel>
        <p className="gwui-panel-text">{`${list} ${missing.length === 1 ? 'has' : 'have'} not checked in, so what they would say is not here.`}</p>
      </Panel>
    </Section>
  )
}

/** The work by team, as the board serves it: what is on record in each team. */
function ByTeam({ b }: { b: Any }) {
  const a = b.byArea
  if (!a || a.state !== 'filled' || !(a.areas ?? []).length) return null
  return (
    <Section heading={a.heading === 'By area' && b.kindOfWork === 'engineering release' ? 'By area of work' : (a.heading ?? 'By team')}>
      {/* One open table, a row for each team (Hafsah, 13 November 2026). Only what the record holds is drawn: how many records are in the team and the sentence the server sends. The prototype's "on pace" and "team read" have no data behind them, so they are not drawn. */}
      <Table
        caption={a.heading === 'By area' && b.kindOfWork === 'engineering release' ? 'By area of work, one row for each' : `${a.heading ?? 'By team'}, one row for each`}
        phone="stack"
        columns={[
          { key: 'area', header: a.heading === 'By team' ? 'Team' : 'Where', rowHeader: true, width: '28%' },
          /* A column of zeros says nothing the sentence beside it does not (salesorg-1440: 'On record: 0' in every row). */
          ...(a.areas.some((x: Any) => Number(x.records) > 0) ? [{ key: 'records', header: 'On record', width: '14%' }] : []),
          { key: 'says', header: 'What the record holds' },
        ]}
        rows={a.areas.map((x: Any) => ({ area: x.area, records: x.records, says: x.says }))}
      />
    </Section>
  )
}

/* ------------------------------------------------------------------ a check-in nobody has answered yet (faith90-board.jpg) */

/**
 * A BOARD WITH NOTHING ON IT SAYS WHAT IS MISSING AND WHAT WOULD FILL IT (board assessment, 15 November: an empty board was nine
 * hundred pixels of nothing). Decided from the record alone: nobody has answered, no piece of work and no figure is on record.
 * Whether anybody was asked is the people list, so the words are true in both cases.
 */
export function theBoardHasNothingOnIt(b: Any): boolean {
  const { answered } = answeredOf(b)
  const anyWork = ((b.workRecords ?? []) as Any[]).some((s) => (s.rows ?? []).length > 0)
  const anyFigure = ((b.objectives ?? []) as Any[]).some((o) => o.count != null) || b.whatTheSystemsShow?.state === 'filled'
  /* A funded project's plan, money, stakeholders and what is coming up are on the board with nobody checked in (boards pass 4, defect 15). */
  const p = b.project ?? {}
  const anyPlan = (b.workPlan ?? []).length > 0 || (p.plan ?? []).length > 0 || (p.money?.months ?? []).length > 0 || (p.stakeholders ?? []).length > 0 || (p.comingUp ?? []).length > 0
  /* A programme across levels draws what each level understood, the visits and the counties; with none of those, nothing else is drawn, whoever has checked in (boards pass 4, defect 1). */
  const anyProgramme = (b.whatEachLevelUnderstood?.levels ?? []).length > 0 || (b.whatTheVisitLogShows?.numbers ?? []).length > 0 || (b.theCounties?.counties ?? []).length > 0
  const aProgrammeWithNoneOfIt = b.kindOfWork === 'a government programme' && !anyWork && !anyProgramme
  return aProgrammeWithNoneOfIt || (answered.length === 0 && !anyWork && !anyFigure && !anyPlan && !anyProgramme)
}
function NothingOnTheBoardYet({ b }: { b: Any }) {
  const asked = answeredOf(b).rows.length
  return (
    <Section heading="Nothing is on this board yet">
      <Panel>
        <p className="gwui-panel-text">
          {answeredOf(b).answered.length > 0
            ? 'People have checked in, but nobody has said yet what the aim means to them, what each county has reached or where the visits were. They will appear here when somebody does.'
            : asked === 0
            ? 'Nobody has checked in yet. Add the people and send the invitations.'
            : asked === 1 ? 'One person has been invited and nobody has checked in yet.' : `${asked} people have been invited and nobody has checked in yet.`}
        </p>
      </Panel>
    </Section>
  )
}

function TheBoardFillsIn({ line }: { line: string | null }) {
  return (
    <div className="pb-fills-in">
      {line && <p>{line}</p>}
    </div>
  )
}

/** What was agreed at the start, as a list beside why getting set up is kept apart. */
function AgreedOnDayOneAndSetUpApart({ b, personId }: { b: Any; personId: string | null }) {
  const s = b.startingState
  const rows: Any[] = s && typeof s === 'object' ? (s.rows ?? []) : []
  const first = firstName((b.participants ?? []).find((x: Any) => x.id === personId)?.name)
  return (
    <div className="pb-two pb-agreed-two">
      {rows.length ? (
        <Panel>
          <h3 className="pb-card-h pb-agreed-h">{first ? `What ${first} and you agreed on day 1` : (s.heading ?? 'What was agreed at the start')}</h3>
          <div className="pb-agreed">
            {rows.map((r, i) => (
              <div className="pb-agreed-row" key={i}>
                <b>{r.when}</b>
                <span>{r.what ?? r.says}</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : <div />}
      <div className="pb-apart">
        <h3 className="pb-card-h">Getting set up is kept apart</h3>
        <Link to="/suite/onboard" className="pb-wide-btn">See the onboarding board</Link>
      </div>
    </div>
  )
}

/** What the lead still has to do before the board can fill in, each from the record. */
function TheFirstSteps({ b, groundId }: { b: Any; groundId: string }) {
  /* How long a check-in takes, from the server's one owner (lib/how-long-setup-takes.ts), the same with the direct morning on or off. */
  const takes = useACheckInTakes()
  const mine = (b.checkInGrid?.rows ?? []).find((r: Any) => r.participantId === b.myParticipantId)
  const cells = Object.values(mine?.cells ?? {}) as string[]
  const iHaveAnswered = cells.includes('done')
  const invited = (b.participants ?? []).filter((x: Any) => x.id !== b.myParticipantId && !x.managingOnly).length
  return (
    <EdgeList label="Getting started">
      {!iHaveAnswered && <EdgeRow kind="decide" title="Your own check-in" detail={takes ?? undefined} actions={<Button kind="secondary" size="small" to={`/grounds/${groundId}`}>Open</Button>} />}
      <EdgeRow kind="decide" title="Say what it’s for, and what counts" detail="In your own words" actions={<Button kind="secondary" size="small" to={`/grounds/${groundId}?tab=context`}>Open</Button>} />
      <EdgeRow kind="decide" title="Add the people in it" detail={invited === 1 ? '1 invited' : `${invited} invited`} actions={<Button kind="secondary" size="small" to={`/grounds/${groundId}?tab=settings`}>Open</Button>} />
    </EdgeList>
  )
}

/** What the organisation kept from another check-in of this kind, served to the lead alone (what-may-be-relevant.ts). */
function ThisMayBeRelevant({ b, groundId }: { b: Any; groundId: string }) {
  const qc = useQueryClient()
  const org = aRealOrganisationName(useAuthStore((st) => (st.user as Any)?.organizationName))
  const items: Any[] = b.mayBeRelevant ?? []
  const notRelevant = useMutation({
    mutationFn: () => apiClient.post(`/grounds/${groundId}/board/not-relevant`, { memoryIds: items.map((i) => i.id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', groundId] }),
    onError: () => toast.error('That didn’t save. Try again.'),
  })
  if (!items.length) return null
  return (
    <div className="pb-relevant">
      <h3 className="pb-card-h">This may be relevant</h3>
      {items.map((i) => (
        <div key={i.id}>
          <p>{i.says}</p>
          {i.whoConfirmedIt && <p className="pb-sub">{i.whoConfirmedIt}</p>}
        </div>
      ))}
      <div className="pb-relevant-actions">
        <Button kind="secondary" size="small" to="/company/context">{org ? `See what ${org} has learned` : 'See what your organisation has learned'}</Button>
        <button type="button" className="gwui-plain-link" disabled={notRelevant.isPending} onClick={() => notRelevant.mutate()}>Not relevant</button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ the board */

export function ThePicturedBoard(p: PicturedBoardProps & { line?: string | null; order: APicturedSection[]; personId?: string | null; seeTheSamePictures?: string | null; leadFirstName?: string | null; reportHeading?: string; unknown?: string[]; }) {
  const { b } = p
  const now = useMemo(() => new Date(), [])
  const deals = (b.workRecords ?? []).find((s: Any) => s.section === 'Deal grid' && (s.rows ?? []).some((r: Any) => r.kind === 'deal')) ?? null
  const groups = dealsByGroup(deals)
  const draw: Record<APicturedSection, () => ReactNode> = {
    lastSession: () => <TheLastSessionIsDone b={b} groundId={p.groundId} />,
    headline: () => <HeadlineAndGap b={b} deals={deals} groups={groups} />,
    closing: () => <WhatIsClosing b={b} />,
    assumes: () => <WhatTheTargetAssumes b={b} />,
    needsYou: () => <WhatNeedsYou b={b} renderActions={p.renderActions} groundId={p.groundId} deals={deals} sessionRows={p.sessionRows} manyInTeams={p.order.includes('everySale') && (!b.releaseFourTeams || b.kindOfWork === 'sales org')} heading={p.order.includes('cohortStands') || p.order.includes('systemsShow') ? 'What needs you' : undefined} />,
    deals: () => (deals ? <EveryDealDayByDay b={b} section={deals} now={now} groundId={p.groundId} /> : null),
    agreedAtTheStart: () => <WhatWasAgreedAtTheStart b={b} />,
    changeSinceLast: () => <ChangeSinceLastCheckIn b={b} />,
    ninetyDays: () => <TheNinetyDays b={b} groundId={p.groundId} seeTheSamePictures={p.seeTheSamePictures ?? null} />,
    history: () => <TheirHistory b={b} personId={p.personId ?? null} />,
    bothSeeIt: () => <WhereYouBothSeeItDifferently b={b} groundId={p.groundId} />,
    teamToday: () => <TheTeamToday b={b} deals={deals} today={isoDay(now)} groundId={p.groundId} />,
    blockers: () => <Blockers b={b} groundId={p.groundId} />,
    patterns: () => <WhatKeepsComingUp b={b} />,
    womenAndDropOff: () => <WomenAndDropOff b={b} />,
    reported: () => <ReportedAgainstCriteria b={b} heading={b.byArea?.state === 'filled' && b.byArea.heading === 'By team' && (b.byArea.areas ?? []).length > 1 ? `Reported vs criteria met, across ${b.byArea.areas.length} teams` : b.kindOfWork && !isASalesKind(b.kindOfWork) ? 'Reported vs evidence, stage by stage' : undefined} />,
    whoCheckedIn: () => <WhoCheckedIn b={b} />,
    overTime: () => p.overTime,
    reports: () => <Reports b={b} groundId={p.groundId} sessionRows={p.sessionRows} navigate={p.navigate} now={now} />,
    everySession: () => <Link to={`/grounds/${p.groundId}?tab=report`} className="pb-wide-btn">Every check-in</Link>,
    otherBoards: () => <TheOtherBoardsYouAreIn groundId={p.groundId} />,
    help: () => <HelpNobodyMentioned b={b} />,
    otherTeams: () => <WaitingOnOtherTeams groundId={p.groundId} />,
    openIssues: () => <OpenIssues b={b} renderActions={p.renderActions} />,
    heading: () => <WhereThisIsHeading b={b} onRecordTheDecision={p.onRecordTheDecision} />,
    recommends: () => <GroundworkRecommends offers={p.recommendations} onAnswer={p.onAnswerRecommendation} busy={p.recommendationBusy} />,
    otherRecords: () => p.otherRecords,
    yourTeam: () => p.yourTeam,
    kindOfWork: () => p.kindOfWork,
    template: () => <TheTemplateSection b={b} />,
    plan: () => <TheProjectsPlan b={b} groundId={p.groundId} />,
    money: () => <MoneyInAndOut b={b} groundId={p.groundId} />,
    stakeholders: () => <TheStakeholders b={b} groundId={p.groundId} />,
    projectComingUp: () => <WhatIsComingUpOnTheProject b={b} />,
    offTrack: () => <IfItGoesOffTrack b={b} />,
    participantNote: () => <YouAreAParticipantHere leadFirstName={p.leadFirstName ?? null} />,
    priorities: () => <ThePrioritiesThisQuarter />,
    yourPart: () => <YourPart b={b} />,
    teamReport: () => <TheTeamsReport b={b} groundId={p.groundId} sessionRows={p.sessionRows} leadFirstName={p.leadFirstName ?? null} heading={p.reportHeading ?? 'The team’s report'} />,
    theDecision: () => <TheDecision b={b} />,
    accounts: () => <EachAccountSideBySide b={b} />,
    knownBelievedUnknown: () => <KnownBelievedUnknown b={b} unknown={p.unknown ?? []} />,
    forYouToDecide: () => <ForYouToDecide b={b} leadFirstName={p.leadFirstName ?? null} />,
    suggestion: () => <TheSuggestion b={b} groundId={p.groundId} personId={p.personId ?? null} />,
    theCase: () => <TheirCase b={b} groundId={p.groundId} personId={p.personId ?? null} />,
    headlineTargets: () => <TheHeadlineAndEachTarget b={b} withBar={b.kindOfWork === 'sales org' || b.kindOfWork === "founder's own check-in" || b.kindOfWork === 'trader training programme'} barBesideEachTarget={b.kindOfWork === "founder's own check-in"} />,
    saidVersusDone: () => <SaidVersusDone b={b} />,
    founderFigures: () => <TheFoundersFigures b={b} />,
    /* The headline's bar is the first metric that has both a figure and a goal somebody stated: filled where a system shows it, ringed where a person said it. */
    question: () => <TheHeadlineAndEachTarget b={b} withoutTargets aimBar={b.kindOfWork === 'MarketView Q4' ? theMetricRows(b.whatTheSystemsShow?.state === 'filled' ? (b.whatTheSystemsShow.numbers ?? []) : [], theMetricsPeopleSaid(b)).find((m) => m.bar)?.bar ?? null : null} />,
    eachLevel: () => <WhatEachLevelUnderstoodSection data={b.whatEachLevelUnderstood} />,
    visitLog: () => <WhatTheVisitLogShowsSection data={b.whatTheVisitLogShows} />,
    counties: () => <TheCountiesSection data={b.theCounties} rows={theTicketGrid(b)?.rows} />,
    opening: () => <TheOpeningSentences data={b.theOpening} />,
    readTop: () => <TheBoardsOwnReadSection data={b.theBoardsOwnRead} place="top" />,
    readEnd: () => <TheBoardsOwnReadSection data={b.theBoardsOwnRead} place="end" />,
    matterStands: () => <WhereTheMatterStandsSection data={b.whereTheMatterStands} />,
    youNeedToDecide: () => <WhatYouNeedToDecideSection data={b.whatYouNeedToDecide} />,
    changedThisWeek: () => <WhatChangedThisWeekSection data={b.whatChangedThisWeek} />,
    systemsShow: () => <WhatTheSystemsShowSection data={b.whatTheSystemsShow} rows={theMetricsPeopleSaid(b)} />,
    saidAndSystemsDiffer: () => <WhereWhatWasSaidAndTheSystemsDifferSection data={b.whereWhatWasSaidAndTheSystemsDiffer} />,
    everySale: () => { const grid = (b.workRecords ?? []).find((x: Any) => (x.section === 'Deal grid' || (x.section === 'Work plan' && b.kindOfWork === "founder's own check-in")) && (x.rows ?? []).length); return grid ? (b.kindOfWork === 'asset loans' ? <EveryTraderAndWhatShowsIt section={grid} groundId={p.groundId} me={b.myParticipantId ?? null} /> : isATicketsKind(b.kindOfWork) ? <EveryTicketAndWhatShowsIt section={grid} kindOfWork={b.kindOfWork} groundId={p.groundId} me={b.myParticipantId ?? null} /> : <EverySaleAndWhatShowsIt section={grid} today={isoDay(now)} groundId={p.groundId} kindOfWork={b.kindOfWork ?? null} me={b.myParticipantId ?? null} />) : null },
    byTeam: () => (isATicketsKind(b.kindOfWork) ? <EachAreaOfTheWork b={b} /> : <ByTeam b={b} />),
    themes: () => <VolumeAndCauses b={b} now={now} />,
    cohortStands: () => <WhereTheCohortStandsSection data={b.whereTheCohortStands} />,
    personPlaceOrModel: () => <OnePersonAPlaceOrTheModel b={b} />,
    supportGiven: () => <SupportGivenSection data={b.supportGiven} />,
    inShort: () => <InShort b={b} groundId={p.groundId} />,
    byWhoTheyAre: () => <ByWhoTheyAreSection data={b.byWhoTheyAre} />,
    whereNextRanked: () => <WhereNextRanked b={b} />,
    whereTheyDisagree: () => <WhereTheyDisagreeSection data={b.whereTheyDisagree} />,
    cantTellYou: () => <WhatThisCantTellYou b={b} />,
    fillsIn: () => <TheBoardFillsIn line={p.line ?? null} />,
    agreedAndApart: () => <AgreedOnDayOneAndSetUpApart b={b} personId={p.personId ?? null} />,
    firstSteps: () => <TheFirstSteps b={b} groundId={p.groundId} />,
    mayBeRelevant: () => <ThisMayBeRelevant b={b} groundId={p.groundId} />,
    situationNote: () => <TheSituationsNote b={b} />,
    situationThemes: () => <WhatKeepsBeingRaised b={b} />,
    obligations: () => <WhatEachSidePromised b={b} />,
    situationTimeline: () => <WhatHappenedDayByDay b={b} />,
    situationPlan: () => <TheSituationsWorkPlan b={b} />,
    risks: () => <TheRisks b={b} />,
    whereTimeWent: () => (b.whereTheTimeWent ?? []).length ? <Section heading="Where the time went"><EdgeList label="Where the time went">{(b.whereTheTimeWent as Any[]).map((x) => <EdgeRow key={x.participantId ?? x.who} kind="look" reason={null} title={x.says} />)}</EdgeList></Section> : null,
    evidenceIndex: () => (b.evidenceIndex ?? []).length ? <EvidenceIndexSection rows={b.evidenceIndex} /> : null,
    busyOrMoving: () => b.busyOrMoving ? <BusyOrMovingSection data={b.busyOrMoving} /> : null,
    contradictions: () => (b.contradictions ?? []).length ? <ContradictionsSection rows={b.contradictions} /> : null,
    questionsForTheLead: () => (b.questionsForTheLead ?? []).length ? <QuestionsForTheLeadSection rows={b.questionsForTheLead} /> : null,
    companyBoard: () => <div style={{ textAlign: 'center' }}><Button kind="quiet" to="/company">See the company board</Button></div>,
  }
  /* Every section is drawn open, in its order: a list of people, deals, targets or deliveries is a table the reader can see, never a folded line (Hafsah, 13 November 2026, ruling on the pilot's 12 November). */
  return <div className="pb">{!p.order.includes('participantNote') && theBoardHasNothingOnIt(b) && <NothingOnTheBoardYet b={b} />}{p.order.map((k) => <FragmentKey key={k}>{draw[k]()}</FragmentKey>)}</div>
}
function FragmentKey({ children }: { children: ReactNode }) { return <>{children}</> }

/**
 * RELEASE 4: THE TEAM'S TEMPLATE, as the template library draws it (templates.jpg): what one piece of work is, the stages in order
 * with what each needs and what shows it, and when a piece of work has stalled. Only where the lead attached one; otherwise nothing.
 */
export function TheTemplateSection({ b }: { b: Any }) {
  const t = b?.template
  /* Whatever is missing from it, a half-drawn template would say "undefined" in a sentence; it is drawn whole or not at all. */
  if (!t?.name || !t.unitOfWork || !t.rollsUpBy || !t.stallRule || !Array.isArray(t.ladder)) return null
  return (
    <Section heading="How this team’s work moves" note={`From the ${t.name} template`}>
      <p className="t-small">{`One piece of work is ${String(t.unitOfWork).charAt(0).toLowerCase()}${String(t.unitOfWork).slice(1)}. It rolls up by ${String(t.rollsUpBy).charAt(0).toLowerCase()}${String(t.rollsUpBy).slice(1)}. It has stalled when: ${String(t.stallRule).charAt(0).toLowerCase()}${String(t.stallRule).slice(1)}.`}</p>
      <div className="list" role="list" aria-label="The stages, in order">
        {(t.ladder as Any[]).map((s, i) => (
          <div className="item" role="listitem" key={s.stage}>
            <i className="sp act" aria-hidden />
            <div className="gw-min0"><div className="h">{`${i + 1}. ${s.stage}`}</div><div className="s">{`It needs ${String(s.needs).charAt(0).toLowerCase()}${String(s.needs).slice(1)}. Shown by ${String(s.verifiedBy).charAt(0).toLowerCase()}${String(s.verifiedBy).slice(1)}.`}</div></div>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ---------------------------------------------------------------- Release 5: a project (the Check-in Reports file, "A project") */
const PROJECT_EDGE: Record<string, 'ready' | 'decide' | 'look' | 'concern'> = { rec: 'ready', act: 'decide', att: 'look', con: 'concern' }

/** The plan: each milestone in order, when it is due and what share of the contract it pays. */
function TheProjectsPlan({ b, groundId }: { b: Any; groundId: string }) {
  const rows: Any[] = b?.project?.plan ?? []
  return (
    <Section heading="The plan" note={rows.length ? undefined : 'No milestones are on record yet.'}>
      {rows.length > 0 && <EdgeList label="The plan">{rows.map((r) => <EdgeRow key={r.id} kind={PROJECT_EDGE[r.tone] ?? 'decide'} title={r.title} detail={r.says} reason={null} />)}</EdgeList>}
      {b.canEditFrame && <AddToTheProject groundId={groundId} what="milestone" participants={b.participants ?? []} />}
    </Section>
  )
}

/** Money in and out, a card for each month, and the tightest month said in its own card. */
function MoneyInAndOut({ b, groundId }: { b: Any; groundId: string }) {
  const m = b?.project?.money
  const add = b.canEditFrame ? <AddToTheProject groundId={groundId} what="money" participants={b.participants ?? []} /> : null
  if (!m?.months?.length) return <Section heading="Money in and out" note="Nothing about money is on record yet.">{add}</Section>
  return (
    <Section heading="Money in and out">
      <div className="g3">
        {(m.months as Any[]).map((x) => (
          <div key={x.month} className="panel pad gw-col-6">
            <b>{x.month}</b>
            <p className="t-small">{x.says}</p>
            {x.tightest && m.tightestSays && <p className="t-small"><b>{m.tightestSays}</b></p>}
          </div>
        ))}
      </div>
      {add}
    </Section>
  )
}

/** The stakeholders: who keeps in touch with each, and what they need, or that it is not known yet. */
function TheStakeholders({ b, groundId }: { b: Any; groundId: string }) {
  const rows: Any[] = b?.project?.stakeholders ?? []
  return (
    <Section heading="Stakeholders" note={rows.length ? undefined : 'No stakeholders are on record yet.'}>
      {rows.length > 0 && <EdgeList label="Stakeholders">{rows.map((r) => <EdgeRow key={r.id} kind={PROJECT_EDGE[r.tone] ?? 'decide'} title={r.title} detail={r.says} reason={null} />)}</EdgeList>}
      {b.canEditFrame && <AddToTheProject groundId={groundId} what="stakeholder" participants={b.participants ?? []} />}
    </Section>
  )
}

/** What is coming up: the funder's next update, with "Rehearse with me" opening Ask on the brief, and the next milestone's invoice. */
function WhatIsComingUpOnTheProject({ b }: { b: Any }) {
  const rows: Any[] = b?.project?.comingUp ?? []
  const showWith = useAskStore((s) => s.showWith)
  if (!rows.length) return null
  return (
    <Section heading="Coming up">
      <EdgeList label="Coming up on the project">
        {rows.map((r) => (
          <EdgeRow key={r.id} kind="decide" title={r.title} detail={r.says}
            actions={r.rehearse && r.brief ? <Button kind="secondary" size="small" onClick={() => showWith(`Rehearse this update with me. Here is the brief Groundwork drew from the record. ${r.brief}`)}>Rehearse with me</Button> : undefined} />
        ))}
      </EdgeList>
    </Section>
  )
}

/** If it goes off track: what is late, the money gap and the stakeholders at risk, from the record; or that nothing is. */
function IfItGoesOffTrack({ b }: { b: Any }) {
  const p = b?.project
  if (!p) return null
  return (
    <Section heading="If it goes off track">
      {(p.offTrack as string[]).length > 0 && <div className="gw-ruled-rows">{(p.offTrack as string[]).map((t) => <p key={t} className="t-small">{t}</p>)}</div>}
      <p className="t-body">{p.offTrackSays}</p>
    </Section>
  )
}
