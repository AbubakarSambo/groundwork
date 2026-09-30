import { hasEnded, howItEnded } from '@/lib/a-ground-that-has-ended'
import { useState } from 'react'
import { WhatSuccessLooksLikeFor } from '@/components/gw/WhatSuccessLooksLike'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { ThatIsOnTheRecord } from '@/components/gw/ThatIsOnTheRecord'
import { TheOtherBoardsYouAreIn } from '@/components/gw/TheOtherBoardsYouAreIn'
import { HowItIsGoing } from '@/components/gw/how-it-is-going'
import { WhatToSettleTogether } from '@/components/gw/what-to-settle-together'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckInLinks } from './CheckInLinks'
import { boardApi, type BoardPresent, type CoverageVariant } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
// The board's own vocabulary now lives in components/gw/kit so every other page
// can be rebuilt from it. Values unchanged: this is an extraction, not a redesign.
import { todayApi, type Need } from '@/api/today'
import { HowThisHasMoved } from '@/components/gw/HowThisHasMoved'
import { ResolutionPanel } from '@/components/gw/ResolutionPanel'
import { useAreYouSure, Confirm } from '@/components/gw/a-second-press-before-it-is-gone'
import { whatWentWrong, whyYouCannotSeeThis } from '@/pages/report/why-you-cannot-see-this'
import { TheJudgement } from '@/components/gw/TheJudgement'
import { WhatTheRecordShows } from '@/components/gw/WhatTheRecordShows'
import { WhatTheNetworkSaid } from '@/components/gw/WhatTheNetworkSaid'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { useIsAPhone } from '@/lib/a-phone-is-not-a-narrow-desktop'
import { NineColumnsIsNotAPhoneScreen } from '@/components/gw/nine-columns-is-not-a-phone-screen'
import { plainWordsByPerson, atTheStart } from '@/lib/a-colleague'
import { theLeadsNote } from '@/lib/the-leads-note'
import { whatTheSwitchboardAllows } from './what-the-switchboard-allows'
import { tileSentence } from '@/components/gw/TheSessionsReport'
import { PatternPanel } from '@/components/gw/ui'
import type { ServedPattern } from '@/api/patterns'

/**
 * WHO A ROW ON THE BOARD IS, WHERE THE SERVER HAS NO NAME TO GIVE. Request 36.
 *
 * The server sends a person's name, or null, and never the lead's words about them. With null this
 * says what the engine says: "A colleague", or "One colleague" and "Another colleague" when several
 * people on this check-in have no name, counted across the whole check-in so the same person is the
 * same words in every section. It used to say "A teammate", which the prototype never says.
 */
function nameOnTheBoard(b: { participants?: { id: string; name: string | null }[] } | null | undefined, participantId: string, name: string | null | undefined): string {
  if (name?.trim()) return name
  const words = plainWordsByPerson(b?.participants ?? [], { named: (p) => !!p.name?.trim() })
  return atTheStart(words.get(participantId) ?? 'a colleague')
}
import { WhereEachPersonIs } from '@/components/gw/where-each-person-is'
import { SplitOneTotalAcrossPeople } from '@/components/gw/split-one-total-across-people'
import { WhatTheTargetAssumes } from '@/components/gw/TargetsBand'
import { whenTheBoardLastChanged } from './when-the-board-last-changed'
import { SuggestionsForTheLead } from '@/components/gw/Suggestions'
import { buildSessionRows } from '@/lib/session-rows'
import { peopleLabels, personLabel } from '@/lib/utils'
import { EVERY_SESSION, sessionDay, checkedIn } from '@/components/gw/TheReportIsAListOfSessions'
import { useAskStore } from '@/stores/ask'
import { Page, CheckInHeader, Section, Panel, Tag, type TagTone, Button as UIButton, PeopleTable, PersonRow, EdgeRow, EdgeList } from '@/components/gw/ui'
import { initialsOf } from '@/pages/org/people-here'
import { cadenceLabel } from '@/lib/cadence'
import { phaseSpineSentence } from '@/lib/phase-spine-sentence'
import { KindOfWorkBanner, WorkRecordsSections } from './WorkRecords'

/**
 * The delivery board.
 *
 * A shared, standing view of where a team's work actually stands, assembled from
 * everyone's separate private accounts. It shows the record, never a verdict, and
 * it is generated - the only thing anyone adds here is the availability poll.
 *
 * The board is NOT a replacement for the report. On a shared ground both exist:
 * this board (team-facing, operational) and each person's own report (private
 * substance). The divergence section here is a pointer; the report holds detail.
 *
 * Which sections render is decided by the server from the ground's scenario
 * family, and a private or mood-sensing ground gets no board at all. This page
 * only renders what the server says it may.
 */

// ---------------------------------------------------------------- primitives






/**
 * U.10 PICTURE-CHECK ROUND 6, ITEM F: THE PROTOTYPE'S WIDE OUTLINED BUTTON ("Every session").
 * `btnGhost` (kit.tsx) is a thin grey-bordered, grey-text button used throughout the product for a
 * secondary action; the prototype's own "Every session" button is heavier - white, a visible dark
 * border, bold near-black text, full width. Kept local to the board rather than added to
 * `btnGhost`, which many other pages already use for its lighter weight.
 */


const dshort = (iso?: string | null) =>
  iso ? whenItWas(iso, 'dayAndMonth') : ' - '

/**
 * U.10 RE-REVIEW ITEM B: A SESSION PILL, AS A SENTENCE ITS OWN READER CAN FOLLOW.
 *
 * "Session 1, 27 Sept, now" - three comma-joined fragments with no verb - was still a list of
 * pieces rather than something read the way a person reads a sentence.
 */
/*
 * U.10 RE-REVIEW ITEM 4: SAY WHAT'S TRUE, NOT "TODAY" FOR A ROUND THAT ISN'T.
 *
 * "Session 1 is today, 27 Sept." read live on 28 September - `state === 'current'` means the
 * currently OPEN round, which is not the same fact as "opened today": a round stays "current"
 * until everybody in it has checked in, however many days that takes. `date` is when the first
 * account in it actually completed, so that is the fact to say, whichever day it is now.
 */
function sessionPillSentence(s: { n: number; state: string; date: string | null; opensOn?: string | null }, groundEnded: boolean): string {
  if (s.date) return `Session ${s.n} opened on ${dshort(s.date)}.`
  if (s.state === 'current' && !groundEnded) return `Session ${s.n} is open now.`
  if (s.opensOn && s.state !== 'done') return `Session ${s.n} opens on ${dshort(s.opensOn)}.`
  return `Session ${s.n} has not opened yet.`
}

/**
 * U.10 RE-REVIEW ITEM C: WHO SEES THIS DIFFERENTLY, NAMED - THE SAME NAMING RULES AS EVERYWHERE
 * ELSE ON THIS PAGE.
 *
 * "You see this differently." under every difference, whoever was reading it, said nothing about
 * who the two sides actually were. `positions[].who` already comes off the wire through the same
 * per-reader masking every other name on this board gets (board.service.ts's `named()`, itself the
 * one peers-are-named rule, `peers-are-named.ts`) - real names where the reader may see them, or
 * the engine's own "A colleague" where they may not. This never re-derives that rule; it only reads
 * what the server already decided and writes the sentence.
 *
 * "A colleague" is not disambiguated between two different hidden people (the server's own
 * simplification, not this screen's), so the moment EITHER side is masked, the sentence falls back
 * to "People see this differently." rather than risk naming the same "a colleague" twice for two
 * different people - which is exactly the case an evaluation check-in's person being reviewed must
 * never see peers named in anyway.
 */
export function whoSeesThisDifferently(positions: { who?: string }[] | undefined, myName: string | null): string {
  let who = (positions ?? []).map((p) => p.who).filter((w): w is string => !!w)
  if (who.length < 2) return 'This is seen differently.'
  if (who.includes('A colleague')) return 'People see this differently.'
  /* The reader reads themselves first: "You and Amani Wekesa", never "Amani Wekesa and You". */
  /* The server has usually already turned the reader's own side into "You"; a real name standing
     in for the reader counts the same. Either way the reader comes first, as "You". */
  const isMe = (w: string) => w === 'You' || (!!myName && w === myName)
  if (who.some(isMe)) who = [who.find(isMe)!, ...who.filter((w) => !isMe(w))]
  const say = (w: string) => (isMe(w) ? 'You' : w)
  return `${say(who[0])} and ${say(who[1])} see this differently.`
}

/**
 * "Seen across 3 sessions", only when it is true: never more sessions than this check-in has had,
 * never a count of one or none as if it were a pattern. `sessionNow` is the session number the
 * board is on; a count above it is the engine's claim running ahead of the record, and is left out.
 */
export function seenAcross(periods: number | null | undefined, sessionNow: number | null): string | null {
  if (!periods || periods < 2) return null
  if (sessionNow == null || periods > sessionNow) return null
  return `Seen across ${periods} sessions.`
}

/** What each record type under "Who owns what" is, in a sentence rather than a bare tag. */
/**
 * THE WORDS OF ONE LINE UNDER "WHO OWNS WHAT", OR NOTHING. The server leaves a line's words out when
 * they named a file this reader may not open (request 46). A line with no words is not drawn at all:
 * its label alone ("This is progress they reported.") would say that something is there to read.
 */
export function theWordsOfALine(text: string | null | undefined): string {
  return (text ?? '').replace(/^\[VERIFIABILITY:[A-Z]+\]\s*/, '').trim()
}

const WHAT_THIS_ITEM_IS: Record<string, string> = {
  COMMITMENT: 'This is a commitment.',
  SUCCESS_DEFINITION: 'This says what success looks like.',
  INTENT: 'This is something they intend to do.',
  PROGRESS: 'This is progress they reported.',
}

// ---------------------------------------------------------------- page

/**
 * Remembered, so the framing is read once rather than re-read on every visit. Expanded by default:
 * somebody meeting this board for the first time has not seen it, and that is the case the panel
 * exists for.
 */
const HOW_TO_READ_KEY = 'gw-board-how-to-read'

/**
 * THE BOARD DRAWS FOR WHICHEVER CHECK-IN IT IS GIVEN.
 *
 * It read its id from the route and nothing else could ask it for one, so the boards page - which
 * switches between them with tabs - would have had to rebuild the board to show more than one. A
 * second board is how two screens come to disagree about one week, and this page is a thousand
 * lines of reads that would have to be kept in step by hand.
 *
 * So the route is the DEFAULT and not the only source. `/grounds/:id/board` passes nothing and is
 * byte-for-byte what it was; the boards page passes the tab somebody picked.
 */
/**
 * WHERE THE RUN IS, counted from sessions everybody has finished (moved here from the foot of the
 * board so the top and the foot read the same answer).
 *
 * NOT `phaseSpine.currentSession`, which is the highest session NUMBER any check-in row carries -
 * rows for the next session are created the moment one completes, so it runs ahead of the run. A
 * spine session is 'done' only when every check-in for it completed, which is the min-across-people
 * rule. And PLANNED sessions, not the ones that happen to have rows yet: `phaseSpine.sessions` lists
 * only the session numbers check-in rows exist for, so the run's length comes from the check-in's
 * own timeline and cadence, which is what the header counts to say "Session 1 of 6".
 */
function whereTheRunIs(data: any, ground: any): { nearTheEnd: boolean; lastSessionDone: boolean } {
  const sessions = (data?.phaseSpine?.sessions ?? []) as { state: string }[]
  const planned = plannedSessionsFor(ground?.timelineDays, ground?.cadence, ground?.plannedSessions)
  const done = sessions.filter((x) => x.state === 'done').length
  if (planned == null || planned <= 0) return { nearTheEnd: false, lastSessionDone: false }
  return { nearTheEnd: done >= planned - 1, lastSessionDone: done >= planned }
}

/*
 * `phaseSpineSentence` moved to lib/phase-spine-sentence.ts (U.10 item 2): TheCheckInHeader.tsx
 * builds the same "Session N of M. Runs until DATE." sentence, so this is now a shared function
 * rather than a second copy of it there.
 */

export function BoardPage({ groundId }: { groundId?: string } = {}) {
  const { id: idFromRoute } = useParams<{ id: string }>()
  const id = groundId ?? idFromRoute
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [variant, setVariant] = useState<CoverageVariant | undefined>(undefined)
  /* Closed unless opened: five paragraphs of instructions were the first screen on a phone. */
  const [howToRead, setHowToRead] = useState(() => localStorage.getItem(HOW_TO_READ_KEY) === 'open')

  /*
   * THE CHECK-IN ITSELF, for one fact the board does not carry: whether the person reading is the
   * one running it. The alignment feed below is theirs alone - see the comment on it - and the
   * board's payload is deliberately identical for everybody, so the distinction has to come from
   * the check-in. Cached under the key the check-in page already uses, so this is usually free.
   */
  const { data: groundForSignals } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })
  const user = useAuthStore((st) => st.user)
  const showAsk = useAskStore((s) => s.show)
  const [searchParams] = useSearchParams()
  const justAnswered = searchParams.get('done') === '1'
  /* Whether to build the attendance grid as a grid at all. See the component it chooses. */
  const onAPhone = useIsAPhone()
  const viewerRunsThisCheckIn = !!user?.id && (groundForSignals as any)?.initiatorId === user.id
  /*
   * WHO MAY CHANGE THE KIND OF WORK (request 76): the lead of this check-in, or an admin of this
   * organisation - the same rule the server checks (aSettingOnlyTheLeadMayChange). Mirrors
   * GroundPage.tsx's own `runsIt` check, rather than a new copy of the rule that could drift from it.
   */
  const canEditKindOfWork = viewerRunsThisCheckIn
    || (user?.role === 'ADMIN' && !!(groundForSignals as any)?.organizationId && (groundForSignals as any).organizationId === user?.organizationId)

  /*
   * U.10 ITEM 7: THE SAME ROWS THE REPORT TAB BUILDS "EVERY SESSION" FROM.
   * `buildSessionRows` is the extraction of what used to be GroundAdminPage's own inline counting
   * (see lib/session-rows.ts) - reused here rather than a second, possibly-diverging copy, per the
   * task's own instruction to reuse the Report tab's query.
   */
  const labelsHere = peopleLabels((groundForSignals as any)?.participants ?? [], { forTheLead: viewerRunsThisCheckIn })
  const labelInASentence = (p: any): string => labelsHere.get(p?.id) ?? personLabel(p)
  const sessionRows = buildSessionRows(groundForSignals as any, user?.id, labelInASentence)

  /* What needs the lead here: Today's items for this check-in. See where it is drawn. */
  const { data: today } = useQuery({ queryKey: ['today'], queryFn: todayApi.get, staleTime: 30_000, enabled: viewerRunsThisCheckIn, retry: false })
  const needsHere = (today?.needs ?? []).filter((n: Need) => n.groundId === id)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['board', id, variant],
    queryFn: () => boardApi.get(id!, variant),
    enabled: !!id,
    retry: false,
  })

  /* Where the run is, read once, so the top and the foot of the board gate the ending panel on the
     same answer (the-exit-belongs-at-the-exit). */
  const { nearTheEnd, lastSessionDone } = whereTheRunIs(data, groundForSignals)
  const plannedSessions = plannedSessionsFor((groundForSignals as any)?.timelineDays, (groundForSignals as any)?.cadence, (groundForSignals as any)?.plannedSessions)

  const [newObjName, setNewObjName] = useState('')
  const [newObjTarget, setNewObjTarget] = useState('')
  const [pollQ, setPollQ] = useState('')
  const [pollOpts, setPollOpts] = useState('')
  const [showPollForm, setShowPollForm] = useState(false)
  /* U.10 item 7: "Over time" opens on ask, the same shape "How to read this board" already uses. */
  const [showOverTime, setShowOverTime] = useState(false)
  const [pollCancelArmed, setPollCancelArmed] = useState(false)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['board', id] })

  const addObjective = useMutation({
    mutationFn: () => boardApi.createObjective(id!, {
      name: newObjName.trim(),
      target: newObjTarget.trim() ? Number(newObjTarget) : null,
    }),
    onSuccess: () => { setNewObjName(''); setNewObjTarget(''); invalidate() },
    onError: () => toast.error('The target was not added. What you typed is still here - try again.'),
  })

  const bumpObjective = useMutation({
    mutationFn: (v: { objectiveId: string; count: number }) =>
      boardApi.updateObjective(id!, v.objectiveId, { count: v.count }),
    onSuccess: invalidate,
    onError: () => toast.error('That count did not change - try again.'),
  })

  /* A second press before a target is gone. See a-second-press-before-it-is-gone.tsx. */
  const sureAboutTarget = useAreYouSure<string>()
  const removeObjective = useMutation({
    mutationFn: (objectiveId: string) => boardApi.deleteObjective(id!, objectiveId),
    onSuccess: invalidate,
    onError: () => toast.error('The target was not removed. Nothing has changed - try again.'),
  })

  const savePoll = useMutation({
    mutationFn: () => boardApi.upsertPoll(id!, {
      question: pollQ.trim(),
      options: pollOpts.split('\n').map((o) => o.trim()).filter(Boolean),
    }),
    onSuccess: () => { setShowPollForm(false); setPollQ(''); setPollOpts(''); invalidate() },
    onError: () => toast.error('The poll did not save. Your answers are still here - try again.'),
  })

  const togglePoll = useMutation({
    mutationFn: (optionId: string) => boardApi.togglePoll(id!, optionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', id] }),
    onError: () => toast.error('Your availability did not change - try again.'),
  })

  if (isLoading) {
    return <div role="status" className="gwui-pt-40 gwui-pr-40 gwui-pb-40 gwui-pl-40 gwui-ink-muted" style={{textAlign: 'center'}}>Loading the board…</div>
  }
  if (error || !data) {
    /*
     * WHICH OF THE THINGS HAPPENED. One branch rendered a permission-flavoured accusation for every
     * failure, with retry off, so a single transient 500 permanently evicted a reader from their own
     * board. The report page already knows how to say which (why-you-cannot-see-this.ts): the same
     * words here, and Try again where trying again can work.
     */
    const why = whyYouCannotSeeThis(whatWentWrong(error))
    return (
      <div className="gwui-mt-48 gwui-mr-auto gwui-mb-48 gwui-ml-auto gwui-pt-0 gwui-pr-20 gwui-pb-0 gwui-pl-20" style={{maxWidth: 620, textAlign: 'center'}}>
        <div className="gwui-fs-15 gwui-mb-6" style={{fontWeight: 700}}>This board could not be loaded.</div>
        <div className="gwui-fs-15 gwui-ink-sub gwui-mb-16">{why.say}</div>
        <div className="gwui-gap-8" style={{display: 'flex', justifyContent: 'center'}}>
          {why.canRetry && <UIButton kind="primary" onClick={() => refetch()}>Try again</UIButton>}
          <UIButton kind={why.canRetry ? 'secondary' : 'primary'} onClick={() => navigate('/grounds')}>Back to check-ins</UIButton>
        </div>
      </div>
    )
  }

  // A private-mode or mood-sensing ground has NO board. Say so plainly and point
  // at the report, rather than showing an empty page that reads as broken.
  if (!data.renders) {
    return (
      <div className="gwui-mt-48 gwui-mr-auto gwui-mb-48 gwui-ml-auto gwui-pt-0 gwui-pr-20 gwui-pb-0 gwui-pl-20" style={{maxWidth: 620}}>
        <Panel>
          <div className="gwui-fs-13 gwui-ink-muted gwui-mb-8" style={{letterSpacing: '.1px', fontWeight: 700}}>
            No shared board here
          </div>
          <div className="gwui-fs-14 gwui-ink-text gwui-mb-16" style={{lineHeight: 1.6}}>{data.reason}</div>
          <div className="gwui-gap-8" style={{display: 'flex'}}>
            <UIButton kind="primary" to={`/grounds/${id}/report`}>Read the report</UIButton>
            <UIButton kind="secondary" onClick={() => navigate(`/grounds/${id}`)}>Back to the check-in</UIButton>
          </div>
        </Panel>
      </div>
    )
  }

  /**
   * THE BOARD IS THERE AND IT IS NOT YOURS TO READ YET.
   *
   * The server answers `renders: true` with `withheldUntilYouCheckIn` when the viewer owes their
   * own check-in, and sends nothing else with it - no sections, no title. The line below read
   * `b.sections.includes(...)` the moment `renders` was true, so the page died on "Cannot read
   * properties of undefined (reading 'includes')" and took the whole Boards page down with it.
   *
   * Hit on a real account with three stalled check-ins, which is exactly the person this answer is
   * written for. They were told the page could not load when nothing had gone wrong: their own
   * answer is simply what the board is waiting on, and the fix is one click away.
   */
  if ((data as any).withheldUntilYouCheckIn) {
    return (
      <div className="gwui-mt-48 gwui-mr-auto gwui-mb-48 gwui-ml-auto gwui-pt-0 gwui-pr-20 gwui-pb-0 gwui-pl-20" style={{maxWidth: 620}}>
        <Panel>
          <div className="gwui-fs-13 gwui-ink-muted gwui-mb-8" style={{letterSpacing: '.1px', fontWeight: 700}}>
            Your answer first
          </div>
          <div className="gwui-fs-14 gwui-ink-text gwui-mb-16" style={{lineHeight: 1.6}}>{(data as any).saying}</div>
          <div className="gwui-gap-8" style={{display: 'flex'}}>
            <UIButton kind="primary" onClick={() => navigate(`/grounds/${id}`)}>Do my check-in</UIButton>
            <UIButton kind="secondary" onClick={() => navigate('/grounds')}>Back to check-ins</UIButton>
          </div>
        </Panel>
      </div>
    )
  }

  const b = data as BoardPresent
  /* Whether the check-in is over, so the board stops drawing a clock. See lib/a-ground-that-has-ended. */
  const groundEnded = hasEnded((b as any)?.groundStatus)
  const endedSaying = howItEnded({ status: (b as any)?.groundStatus, endState: (b as any)?.endState })
  /*
   * U.10 (a): THE HEADER'S OWN CADENCE LINE, THE PROTOTYPE'S ONE SENTENCE.
   * board-as-lead.txt puts the cadence, the round count and the end date on one line under the
   * title ("Daily on weekdays, from 4pm. Session 38 of 65. Runs until 30 September."). Built here,
   * once ended replaced by the plain fact of how it ended, rather than left to the shared
   * CheckInHeader (which other pages use with a cadence-only subtitle) to guess at.
   */
  const cadenceWords = (groundForSignals as any)?.cadence ? cadenceLabel((groundForSignals as any).cadence) : null
  const spineWords = phaseSpineSentence(
    b.phaseSpine?.currentSession ? { startsAt: null, endsAt: b.phaseSpine?.endsAt ?? null, currentSession: b.phaseSpine.currentSession } : null,
    plannedSessions ?? null,
  )
  const cadenceLine = endedSaying ?? [cadenceWords ? `${cadenceWords}.` : null, spineWords].filter(Boolean).join(' ')
  /*
   * U.10 (a): THE SAME FIVE TABS, READ-ONLY FILTERED THE SAME WAY (an-admin-who-only-reads-has-no-
   * check-in-tab.spec.tsx pinned this against the old TheCheckInHeader; the-board-as-each-reader-
   * reads-it.spec.tsx now pins the same rule here). An admin who neither runs this check-in nor
   * takes part in it gets the prototype's read-only three tabs (read-only-view.txt): Board, Context,
   * People and setup - no Check-in (nothing of theirs to answer), no My work (nothing of theirs to
   * carry).
   */
  const isAParty = !!b.myParticipantId
  const myWorkTab = viewerRunsThisCheckIn ? 'sessions' : 'record'
  const headerTabs = [
    { key: 'board', label: 'Board', to: `/grounds/${id}/board` },
    ...(viewerRunsThisCheckIn || isAParty ? [{ key: 'chat', label: 'Check-in', to: `/grounds/${id}` }] : []),
    { key: 'context', label: 'Context', to: `/grounds/${id}?tab=context` },
    ...(viewerRunsThisCheckIn || isAParty ? [{ key: myWorkTab, label: 'My work', to: `/grounds/${id}?tab=${myWorkTab}` }] : []),
    { key: 'settings', label: 'People and setup', to: `/grounds/${id}?tab=settings` },
  ]
  const has = (s: string) => b.sections.includes(s as any)
  /* Said once, at the top - and the divergence card below stays short rather than repeating it. */
  /*
   * ITEM D, CHECKED AND DELIBERATELY LEFT AS IT WAS. `whoIsInRound` answers a different question
   * (who is expected to check in this round - a managing-only lead still counts for session 1) from
   * this one (are there two ACCOUNTS to compare - a managing-only lead never gives one, ever).
   * Tried unifying them; it broke "a managing-only lead is not the second account"
   * (a-shared-picture-needs-two-accounts.spec.tsx), a rule this board already tests deliberately, so
   * it was reverted. This board has no other client-computed count of people to point at
   * `whoIsInRound` - every other figure on it (answered this round, checked-in counts) already
   * comes straight off the server (`howItIsGoing.glance`, `checkInGrid`), so there is nothing here
   * for two different counting rules to disagree about. See the morning report.
   */
  const onlyOnePersonHere = (b.participants ?? []).filter(p => !p.managingOnly).length < 2
  /* The reader's own name, as this board already resolves it, so "who sees this differently" can say "You". */
  const myName = b.myParticipantId ? (b.participants ?? []).find((p) => p.id === b.myParticipantId)?.name ?? null : null

  /**
   * A HEADING WITH NOTHING UNDER IT. W-UX-7.
   *
   * "A heading called 'Against the plan' with nothing under it - looks broken." And it was not one
   * heading: every zone on this board tested only whether the SECTION exists, while the content
   * under it also tested whether there is any DATA. So the moment a section was switched on but
   * empty - which is every board on its first day - the heading appeared alone above a rule.
   *
   * `shown` is the one place a section's real condition lives, and both the zone and its content
   * read it. A zone cannot render unless something under it will.
   */
  /*
   * U.10 RE-REVIEW ITEM A: THE SWITCHBOARD SAYS WHAT'S ON, PER SITUATION - "nothing that's off".
   * `has()` is the server's own per-FAMILY gate; this is the finer per-SITUATION layer from G2 on
   * top of it, for the 8 sections this pass can map. See what-the-switchboard-allows.ts.
   */
  const allowed = (boardSection: string) => whatTheSwitchboardAllows(b.scenario, boardSection)

  const shown = {
    quickRead: has('quickRead') && allowed('quickRead') && !!b.quickRead,
    startingState: has('startingState') && allowed('startingState') && !!b.startingState,
    decisions: has('decisions') && !!b.decisions?.length,
    /*
     * THE ONLY WAY TO SET A TARGET WAS INSIDE A SECTION THAT ONLY APPEARED ONCE A TARGET EXISTED.
     *
     * Every other section here hides when it is empty, which is right: a heading with nothing under
     * it reads as a screen that failed to load. This one is not like the others. It holds the
     * lead's "Add target" form AND the server's own prompt for the empty case - "No targets set
     * yet, so there is nothing for this board to measure progress against. Add two or three things
     * this ground is aiming for." Gated on `b.objectives.length`, that sentence could never be
     * read by the only person able to act on it, and the form to act with was hidden beside it.
     *
     * Found by setting one up as a customer would: ten salespeople, a number for each, and nowhere
     * in the product to put a single one of them. It is also why no objective in the database has
     * ever carried a target - not neglect, unreachable by construction.
     *
     * So it shows when there is something to show, OR when the reader is the person who can add
     * the first one. A party who cannot edit still sees nothing rather than an empty heading.
     */
    objectives: has('objectives') && allowed('objectives') && (!!b.objectives?.length || !!b.canEditFrame),
    cascade: has('cascade') && !!b.cascade,
    hiddenContributors: has('hiddenContributors') && !!b.hiddenContributors?.rows?.length,
    divergence: has('divergence') && allowed('divergence') && !!b.divergence,
    /* The note stands in for the block before a round has closed, so either one is enough to show. */
    whatTheRoomIsAbout: has('whatTheRoomIsAbout') && allowed('whatTheRoomIsAbout')
      && (!!b.whatTheRoomIsAbout?.aims.length || !!b.whatTheRoomIsAbout?.places.length
        || !!b.whatTheRoomIsAbout?.things.length || !!b.whatTheRoomIsAboutNote),
    whoOwnsWhat: has('whoOwnsWhat') && !!b.whoOwnsWhat,
    dependencies: has('dependencies') && allowed('dependencies') && !!b.dependencies,
    checkInGrid: has('checkInGrid') && !!b.checkInGrid,
    /* Lead-only and absent for everybody else, so there is nothing to gate on here beyond its
       presence: the server does not send it to a reader who may not have it. */
    eachPerson: !!b.eachPerson?.length,
    /*
     * U.10 RE-REVIEW, NEEDS HAFSAH 0f: LEAD ONLY UNTIL SHE ANSWERS.
     *
     * "Contribution against role" and "Where work is landing" are the board's own read on how one
     * person's work is going against their role - no prototype screen shows either to anyone. Until
     * 0f is answered, these draw for whoever runs the check-in only, the same gate `eachPerson`
     * already uses, so a participant is never shown a colleague's own contribution or coverage read.
     */
    contribution: has('contribution') && !!b.contribution && viewerRunsThisCheckIn,
    coverage: has('coverage') && !!b.coverage && viewerRunsThisCheckIn,
    patterns: has('patterns') && allowed('patterns') && !!b.patterns,
  }
  // Only the caller's own availability is theirs to toggle.
  const myIds = new Set(b.myParticipantId ? [b.myParticipantId] : [])

  /**
   * U.10: THE LAST 10 CHECK-INS, AS SQUARES, WHEREVER THE BOARD DRAWS A PERSON'S ROW.
   *
   * "The team today" (board-as-lead.jpg) and "Who checked in" both draw the same fact - a row of
   * ten small squares, filled navy for checked in, empty for missed, nothing for not yet open - so
   * this is computed once from the same `checkInGrid` the session table already uses, kept to the
   * last 10 sessions, and handed to whichever section wants it for a given participant.
   */
  const squaresFor = (participantId: string): { key: number; state: 'done' | 'empty' | 'upcoming' }[] => {
    if (!b.checkInGrid) return []
    const row = b.checkInGrid.rows.find((r) => r.participantId === participantId)
    if (!row) return []
    const sessionState = new Map((b.phaseSpine?.sessions ?? []).map((ps) => [ps.n, ps.state]))
    const last10 = b.checkInGrid.sessions.slice(-10)
    return last10.map((s) => {
      const v = row.cells[String(s)] ?? 'na'
      const upcoming = v === 'na' && sessionState.get(s) === 'upcoming'
      const checkedIn = v === 'done' || v === 'in-progress'
      return { key: s, state: upcoming ? 'upcoming' : checkedIn ? 'done' : 'empty' }
    })
  }

  /* "The team today", with what keeps coming up under each person's own line, where the record has
     found something (board-as-lead.txt). `eachPersonToday` carries the same rows as `eachPerson`
     with that one sentence added; merged here rather than in two places the row could drift apart. */
  const visiblePatterns = (b.patterns ?? []).filter((p) => viewerRunsThisCheckIn || p.yours)
  const keepsComingUpByParticipant = new Map((b.eachPersonToday ?? []).map((r) => [r.participantId, r.keepsComingUp ?? null]))
  /* PROTECTED (Hafsah, 29 September): "The team today" promises "what keeps coming up" on each
     person's line. The board's own line needs three finished sessions of rows; a pattern the
     server has served, and this reader may read, says it too, so the line never sits empty while
     the section below shows that person's pattern. */
  const patternHeadingByParticipant = new Map<string, string>()
  for (const p of visiblePatterns) if (p.participantId && p.heading && !patternHeadingByParticipant.has(p.participantId)) patternHeadingByParticipant.set(p.participantId, p.heading)
  const eachPersonRows = (b.eachPerson ?? []).map((r) => ({ ...r, keepsComingUp: keepsComingUpByParticipant.get(r.participantId) ?? patternHeadingByParticipant.get(r.participantId) ?? null }))

  /*
   * WHAT KEEPS COMING UP, THE SECTION (board-as-lead.txt). The server already serves only what this
   * reader may read (api/src/modules/patterns/who-reads-a-pattern.ts): a colleague's own pattern
   * only, everybody's for whoever runs the check-in - its lead, whoever set it up, or an admin of
   * its organisation (`runsIt`, the same test `board.service.ts` calls `runsThisGround`). `eachPerson`
   * is served under that exact same test (`has('checkInGrid') && runsThisGround`), so its presence
   * used to stand in for "this reader runs it" here too - which wrongly drew another person's
   * pattern for an admin who only reads the board and does not run it.
   *
   * U.4 REVIEW, ITEM 1: THE MORE PRIVATE OPTION, UNTIL HAFSAH DECIDES (Needs Hafsah 0-pat2, request
   * 84). An admin who only reads is told, on their own report and elsewhere, that a colleague's
   * pattern reaches only the person who runs the check-in - so drawing it for that same admin here
   * made the promise untrue. Until she answers, a colleague's pattern is drawn only for
   * `viewerRunsThisCheckIn` (the lead, or whoever set this check-in up), never for an admin who
   * merely has read access to it. `.yours` is kept here too, so a colleague's board never draws
   * another person's pattern even if this page is ever handed one by mistake - the rule this file
   * must never be the one to weaken.
   */
  const nameByParticipantId = new Map((b.participants ?? []).map((p) => [p.id, p.name]))
  const patternPersonName = (participantId: string, yours: boolean) =>
    (participantId === b.myParticipantId ? 'You' : nameByParticipantId.get(participantId)) || (yours ? 'You' : 'A colleague')

  return (
    <Page>
        {/*
          U.10 (c1): THE SHARED PAGE RHYTHM APPLIES NOW (Page's own `.gwui-page-wrap > * + *`, 30px
          between direct children), the way every other rebuilt page gets its section spacing - not
          escaped by a wrapping div, which is what made "What we are aiming for" touch the panel
          above it (the switchboard sections below were plain siblings with no margin of their
          own). Every element up to here (the header, "Last updated…", the kind-of-work banner, the
          session pills, "How to read this board" and so on) already carries its own inline
          marginTop, which wins over the class rule - so removing the escape hatch changes nothing
          about their spacing, and only affects elements that had none, which is exactly the
          switchboard's sections further down.
        */}
        {/* Somebody who has just answered from a link lands here with ?done=1: their answer landed, and where the report goes. */}
        {justAnswered && <ThatIsOnTheRecord groundId={id!} />}

        {/*
          U.10 (a): THE PROTOTYPE'S HEADER AND TABS (board-as-lead.jpg), NOT THE DARK NAVY CARD.
          "← Back to the check-in" and a dark header of the board's own invention are gone; every
          check-in page now shares the same header (components/gw/ui/CheckInHeader.tsx, as
          GroundAdminPage.tsx and GroundParticipantPage.tsx already use it) for the breadcrumb, the
          serif title, the cadence line, "Your check-in", "Ask" and the tab bar - drawn here inside
          the shared Page frame (components/gw/ui/Page.tsx), not a bespoke wrapper of the board's
          own. The old components/gw/TheCheckInHeader.tsx is retired from this page (it still runs
          the report pages, which this task does not touch).

          THE OTHER BOARDS, BESIDE THE NAME OF THIS ONE (picture-check round 6, item A). A board was
          a page you arrived at from one check-in and left the same way - read one, back to the
          list, find the next, open it, open its board. See the component for why the server says
          which have one. It used to sit above the header of its own accord, styled for the dark
          header the board no longer has - on the cream page its near-white text on white was almost
          invisible, and the prototype has nothing above the breadcrumb. It is real navigation, not
          the check-in switcher, so rather than delete it, it now draws in the tab row's own
          "Views ▾" slot (not built - nothing answers what that menu would offer), restyled for a
          light ground. NOT WHEN THE BOARDS PAGE IS ALREADY SWITCHING: on /boards the tabs above do
          this job, and two switchers is a reader asking which of them is the real one.
        */}
        <CheckInHeader
          crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label: b.title }]}
          title={b.title}
          subtitle={cadenceLine || undefined}
          action={(
            <div className="gwui-gap-16" style={{display: 'flex', alignItems: 'center', flexShrink: 0}}>
              {/*
                THE PROTOTYPE USES TWO DIFFERENT WORDS HERE. The lead's own board says "Your
                check-in" (board-as-lead.txt); a party's says "Start my check-in"
                (board-as-participant.txt). Both go to the same place - the Check-in tab.
              */}
              {(viewerRunsThisCheckIn || isAParty) && (
                <Link
                  to={`/grounds/${id}`}
                  className="gwui-pt-8 gwui-pr-14 gwui-pb-8 gwui-pl-14 gwui-ink-white gwui-fs-16" style={{borderRadius: 7, background: 'var(--gw-navy)', fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit'}}
                >
                  {isAParty && !viewerRunsThisCheckIn ? 'Start my check-in' : 'Your check-in'}
                </Link>
              )}
              <button
                type="button"
                onClick={showAsk}
                className="gwui-rule-none gwui-pt-0 gwui-pr-0 gwui-pb-0 gwui-pl-0 gwui-fs-13-5 gwui-ink-navy" style={{background: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline'}}
              >
                Ask
              </button>
            </div>
          )}
          active="board"
          tabs={headerTabs}
          trailing={!groundId ? <TheOtherBoardsYouAreIn groundId={id!} /> : undefined}
        />

        {/*
          WHEN IT LAST CHANGED, AND THAT OPENING IT CHANGES NOTHING (U.10). The same line for every
          reader, from the server's `lastChangedAt`. Then, for an admin who only reads, who runs it.
          The prototype has this small-grey line directly under the tab bar.
        */}
        <p className="gwui-fs-15 gwui-ink-sub gwui-mt-14 gwui-mr-0 gwui-mb-0 gwui-ml-0" style={{lineHeight: 1.55}}>
          {whenTheBoardLastChanged(b.lastChangedAt)}
        </p>
        {b.readOnlyNote && (
          <p role="note" className="gwui-fs-15 gwui-ink-text gwui-mt-8 gwui-mr-0 gwui-mb-0 gwui-ml-0" style={{lineHeight: 1.55}}>{b.readOnlyNote}</p>
        )}

        {/*
          THE KIND OF WORK, SAID ONCE, NEAR THE TOP OF THE BOARD (item 4). The lead, or an admin of
          this organisation, can change it and its own stage names; a participant reads the same
          sentence and gets no "Change" button. See WorkRecords.tsx.
        */}
        <KindOfWorkBanner
          groundId={id!}
          kindOfWork={(b as any).kindOfWork ?? null}
          workStages={(groundForSignals as any)?.workStages}
          canEdit={canEditKindOfWork}
        />

        {/*
          HOW IT IS GOING, AND THE SESSION SPINE - KEPT, RESTYLED AS PLAIN TEXT (U.10 item 2).

          "When I come in as a manager, I want progress/status and blockers/risks." The summary
          paragraph and the glance line are the same component the list and the boards page draw
          (how-a-check-in-is-going.ts computes it once); only the dark card they used to sit in is
          gone, in favour of the prototype's plain first block under the header. The clickable
          session spine - which the prototype's own header does not draw, but is real, valuable
          navigation this board already had - is kept underneath it rather than dropped.
        */}
        {(b as any).howItIsGoing && (
          <div className="gwui-mt-16">
            <HowItIsGoing
              summary={(b as any).howItIsGoing.latestSummary}
              glance={(b as any).howItIsGoing.glance}
            />
          </div>
        )}

        {has('phaseSpine') && b.phaseSpine && (
          <div className="gwui-mt-10">
            <div className="gwui-gap-10" style={{display: 'flex', flexWrap: 'wrap'}}>
              {/*
                A FINISHED SESSION OPENS ITS REPORT, which is a rule this codebase already made
                and this was the one list not keeping it: "a finished session opens the REPORT and
                not the transcript - that holds for every list there is". My record keeps it, the
                party's report keeps it, the Report tab keeps it. These were plain divs.
                A session that has not happened is not a link, because there is nothing behind it
                yet - so the ones that have are buttons and the rest stay as they were.
              */}
              {b.phaseSpine.sessions.map((s) => {
                const been = s.state === 'done' || (s.state === 'current' && !groundEnded)
                const face = sessionPillSentence(s, groundEnded)
                const skinClass = `gwui-fs-13 gwui-rule gwui-pt-4 gwui-pr-10 gwui-pb-4 gwui-pl-10 ${s.state === 'current' ? 'gwui-ink-green' : 'gwui-ink-sub'}`
                const skinStyle = { borderRadius: 20, background: s.state === 'current' ? 'var(--gw-green-bg)' : 'white', fontWeight: s.state === 'current' ? 700 : 500 } as const
                if (!been) return <div key={s.n} className={skinClass} style={skinStyle}>{face}</div>
                return (
                  <button
                    key={s.n}
                    type="button"
                    onClick={() => navigate(`/grounds/${id}/session/${s.n}`)}
                    className={skinClass}
                    style={{...skinStyle, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3}}
                  >
                    {face}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/*
          GROUNDWORK SUGGESTS … (C3, U.13, suggestion-daniel.txt), for whoever runs it: the
          suggestion with why, what would change it and the person's own answer, and "Your
          decision". The server serves it to the lead alone; nobody else is drawn anything here.
        */}
        {viewerRunsThisCheckIn && (
          <div className="gwui-mt-14">
            <SuggestionsForTheLead groundId={id!} where="board" />
          </div>
        )}

        {/*
          HOW IT ENDS, AT THE TOP (U.11, day-30-and-60.txt and ending-and-probation-review.txt).
          Once it has ended, everyone reads the outcome, who decided, when, and why. Near the end,
          the lead reads "It’s yours to decide how this ends." with the way to the ending page.
        */}
        <div className="gwui-mt-14">
          <ResolutionPanel
            groundId={id!}
            place="board-top"
            nearTheEnd={nearTheEnd}
            lastSessionDone={lastSessionDone}
          />
        </div>

        {/*
          WHAT NEEDS YOU IN THIS CHECK-IN (board-as-lead.txt), for whoever runs it. Not a second read:
          the same items Today shows (GET /today, already cut to what this reader may see), kept to
          this check-in. So the board and Today cannot disagree about what needs the lead.
        */}
        {viewerRunsThisCheckIn && needsHere.length > 0 && (
          <Section heading="What needs you in this check-in">
            <EdgeList label="What needs you in this check-in">
              {needsHere.map((n: Need) => (
                <EdgeRow
                  key={n.key}
                  kind={n.kind}
                  title={n.title}
                  detail={n.detail ?? undefined}
                  actions={<UIButton kind="secondary" size="small" to={n.action.to}>{n.action.label}</UIButton>}
                />
              ))}
            </EdgeList>
          </Section>
        )}

        {/*
          THE INSTRUCTIONS WERE BIGGER THAN THE THING THEY EXPLAINED. W-UX-7.
          
          Her audit note: "The 'how to read this board' box is bigger than the board." Seen on the
          running page and it was true - four lines of dark panel above a board whose first section
          had not been reached yet.
          
          NOT DELETED, and the wording is not touched. This framing is what keeps the board a mirror
          rather than a weapon, and somebody meeting it for the first time should read it. What was
          wrong is that it was read AT them again on every single visit.
          
          So: the load-bearing sentence stays on the page always; the rest opens on ask, and the
          choice is remembered. A returning person gets the board they came for and the reminder
          within one click.
        */}
        {/*
          U.10: A PLAIN LINK, THE WEIGHT THE PROTOTYPE GIVES IT.
          The prototype has no dark card here at all - just a small grey "How to read this board"
          line among the rest of the page. The words below are unchanged; only the dark indigo panel
          (rgb(32,35,62)) is gone, in favour of the same small-grey-text treatment as the rest of the
          board (see "Last updated…" just above).
        */}
        <div className="gwui-mt-12">
          <p className="gwui-fs-15 gwui-ink-sub gwui-mt-0 gwui-mr-0 gwui-mb-0 gwui-ml-0" style={{lineHeight: 1.55}}>
            Built from what each person shared in their private check-in. Use it to see what&rsquo;s going on and guide the conversation. It&rsquo;s not a verdict.
          </p>
          {howToRead && (
            <>
              <p className="gwui-fs-15 gwui-ink-sub gwui-mt-7" style={{lineHeight: 1.55}}>
                If something doesn&rsquo;t feel right, raise it in your next check-in. The board updates as people share more.
              </p>
              <p className="gwui-fs-15 gwui-ink-sub gwui-mt-7" style={{lineHeight: 1.55}}>
                Each person is shown in the context of their own role, not scored against everyone else.
              </p>
              <p className="gwui-fs-15 gwui-ink-sub gwui-mt-7" style={{lineHeight: 1.55}}>
                This is the shared picture from this round of check-ins. It can change as the picture changes.
              </p>
              <p className="gwui-fs-15 gwui-ink-sub gwui-mt-7" style={{lineHeight: 1.55}}>
                Where people see things differently or progress has stalled, you can see what each person shared and support them.
              </p>
            </>
          )}
          <button
            onClick={() => setHowToRead(v => { localStorage.setItem(HOW_TO_READ_KEY, v ? 'closed' : 'open'); return !v })}
            className="gwui-mt-6 gwui-rule-none gwui-pt-0 gwui-pr-0 gwui-pb-0 gwui-pl-0 gwui-fs-13-5 gwui-ink-navy" style={{background: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline'}}
          >
            {howToRead ? 'Show less' : 'How to read this board'}
          </button>
        </div>

        {/*
          A SHARED PICTURE NEEDS TWO ACCOUNTS, AND THE BOARD SAYS SO.

          The check-ins list carries this as a chip and a party's report tab carries it as a note.
          The board, which is the shared picture itself, carried nothing: with one person on the
          ground it drew "Nothing cross-referenced yet", an empty grid and a quick read of one, and
          left the reader to work out that no amount of waiting would change it. The rule refuses a
          shared report below two people, so the page says the same thing the rule does, and names
          who can change it.
        */}
        {onlyOnePersonHere && (
          <div role="status" className="gwui-rule-amber gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14 gwui-mt-12 gwui-fs-15 gwui-ink-amber" style={{background: 'var(--gw-amber-bg)', borderRadius: 12, lineHeight: 1.6}}>
            This board compares accounts, and there is one person on this check-in.{' '}
            {b.canEditFrame ? 'Add somebody and it will build from the next round.' : 'It will build once the person running this check-in adds somebody.'}
          </div>
        )}

        {/*
          U.10 RE-REVIEW ITEM 2: THE SWITCHBOARD'S OWN ORDER, MOVED FROM THREE SEPARATE ZONES.

          G2 (docs/modules.md) and the prototype's own board (board-as-lead.txt) put these in one
          order: Targets, then what was agreed at the start, then accounts side by side, then what
          people are after. Objectives used to sit far down in "Against the plan"; divergence had
          been moved to the very top in an earlier review, before the switchboard existed; starting
          state and the quick read sat under "At a glance". All four zones are gone from this
          group now - the prototype draws no zone dividers at all, only section headings one after
          another - and what were once described as separate bands is one ordered run, built from
          orderedSwitchboardSections() for every situation this pass can compute an order for.
          Cascade and "what success looks like" stay directly above objectives, which is where the
          plan they qualify already sat.
        */}
        {/*
          WHAT THIS SITS UNDER, ABOVE EVERYTHING IT QUALIFIES.

          A team writing results underneath a wider objective cannot be read at all without the
          wider objective on the page - every line of movement below means something different
          depending on what it was in service of. So this goes at the very top of the zone, above
          the definition of success, and it renders its own no: a group that opened an alignment
          check-in and never named what it aligns to is told so plainly rather than shown a gap.
        */}
        {/*
          U.10 (c1): FROM THE SHARED PARTS. The card's own title (18px, of its own invention) is
          now the section's real heading, the same 21px every other section on the board uses -
          this was the one heading that sat inside its own card rather than above it.
        */}
        {shown.cascade && b.cascade && (
          <Section heading={b.cascade.isCascade ? 'What this sits under' : 'Nothing above this'}>
            <Panel>
              {b.cascade.parentNamed && (
                <div className="gwui-fs-16 gwui-ink-text gwui-mb-6" style={{fontWeight: 600, lineHeight: 1.35}}>
                  {b.cascade.parentNamed}
                </div>
              )}
              <p className="gwui-mt-0 gwui-mr-0 gwui-mb-0 gwui-ml-0 gwui-fs-15 gwui-ink-sub" style={{lineHeight: 1.55}}>{b.cascade.why}</p>
              {b.cascade.teamsNamed.length > 1 && (
                <div className="gwui-mt-8 gwui-gap-6" style={{display: 'flex', flexWrap: 'wrap'}}>
                  {b.cascade.teamsNamed.map((t: string) => (
                    <Tag key={t} tone="plain">{t}</Tag>
                  ))}
                </div>
              )}
            </Panel>
          </Section>
        )}

        {/*
          THE PLAN'S OWN TOP LINE, WHICH THIS ZONE WAS MISSING.

          "Against the plan" opened on named targets and where accounts differ - both real, both
          downstream of a thing the board never showed: what success was said to be in the first
          place, and what each person independently says it is. The board is the shared picture, so
          the definition everybody is being read against belongs at the top of this zone rather than
          only on the Setup tab where one person typed it.

          U.10 (c1): its own heading, from the shared Section - `headingIsTheCallers` tells the
          component to leave its own internal heading out, since the section above it now draws one.
        */}
        {(shown.objectives || shown.divergence) && (
          <Section heading="What success looks like">
            <Panel>
              <WhatSuccessLooksLikeFor groundId={id!} headingIsTheCallers />
            </Panel>
          </Section>
        )}

        {shown.objectives && b.objectives && (
          <Section heading="What we are aiming for" note="The lead sets these targets.">
            {/* The privacy setting is on and some numbers still have nobody's name on them, so
                everybody can read those. Said to the only person who can fix it. */}
            {/* One total, ten people, from the export they already have. Above the form, because
                somebody with a team and a committed number reaches for this before typing. */}
            {b.canEditFrame && <SplitOneTotalAcrossPeople groundId={id!} />}
            {b.targetsNobodyOwns && (
              <div className="gwui-rule-amber gwui-pt-10 gwui-pr-14 gwui-pb-10 gwui-pl-14 gwui-mb-8 gwui-fs-15 gwui-ink-amber" style={{background: 'var(--gw-amber-bg)', borderRadius: 10, lineHeight: 1.5}}>
                {b.targetsNobodyOwns}
              </div>
            )}
            {b.objectivesPrompt && (
              <div className="gwui-rule-amber gwui-pt-10 gwui-pr-14 gwui-pb-10 gwui-pl-14 gwui-mb-8 gwui-fs-15 gwui-ink-amber" style={{background: 'var(--gw-amber-bg)', borderRadius: 10, lineHeight: 1.5}}>
                {b.objectivesPrompt}
              </div>
            )}
            <Panel pad={false}>
              {b.objectives.map((o) => {
                /*
                  A MEASURE THAT GOES DOWN IS STILL GOING WELL.

                  This was count/target, so a ceiling - "first response under four hours", "no more
                  than two stock-outs" - filled backwards: a team getting faster watched their bar
                  shrink. The server now sends the journey, worked out from where it started rather
                  than from a column anybody has to set. The old arithmetic is the fallback for a
                  board whose rounds predate any snapshot.
                */
                const pct = o.journey?.covered ?? (o.target && o.target > 0 ? Math.min(100, Math.round((o.count / o.target) * 100)) : 0)
                return (
                  <div key={o.id} className="gwui-panel-row">
                    <div className="gwui-gap-12" style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap'}}>
                      <div className="gwui-fs-16" style={{flex: 1, fontWeight: 600, minWidth: 160}}>
                        {o.name}
                        {o.isNew && <span className="gwui-ml-7"><Tag tone="plain">new</Tag></span>}
                        {/*
                          WHOSE NUMBER IT IS, on its own line. "12 shops· Rukia Otieno" read live: the
                          name sat right after the target with only a CSS margin between them, no
                          space in the text itself. Said as a plain sentence below the name instead.
                        */}
                        {o.owner && (
                          <div className="gwui-ink-sub gwui-fs-13-5 gwui-mt-2" style={{fontWeight: 400}}>{o.owner}’s own target</div>
                        )}
                        {/*
                          A NUMBER NOBODY HAS DEFINED IS NOT AN AGREED NUMBER, AND THE ROW SAYS SO.
                          "signed 12m" read as settled while the lead's own note, one page away, said
                          nobody had decided whether the 12m is signed or recognised revenue. The
                          sentence is the lead's own; it does not change or block the target.
                        */}
                        {o.notSettled && <span className="gwui-ml-7"><Tag tone="attention">definition not settled</Tag></span>}
                      </div>
                      {/*
                        NOTHING TO MEASURE MEANS NOTHING TO DRAW. An aim with no number got an empty
                        bar, a "0" and "no change" beside it - read live as "Confirm her in the role ·
                        0 · no change", which says the decision did not happen. Without a target the
                        row is the aim and nothing else.
                      */}
                      {o.target != null ? (
                        <>
                          <div style={{width: 140, height: 7, borderRadius: 6, background: '#D6DBEA', overflow: 'hidden'}}>
                            <div style={{height: '100%', width: `${pct}%`, background: 'var(--gw-navy)', borderRadius: 6}} />
                          </div>
                          {/* Three numbers a person can check, rather than a share of a target that
                              means the opposite thing on a ceiling. */}
                          {/*
                            U.10 RE-REVIEW ITEM 3: TWO SENTENCES, NOT COMMA-JOINED PIECES.
                            "12, up from 0, aiming for 12" and "up 12 this session" read as
                            fragments strung together rather than something said to a reader.
                          */}
                          <div className="gwui-fs-15 gwui-ink-sub" style={{minWidth: 96, textAlign: 'right'}}>
                            {o.journey?.start != null
                              ? (<><b className="gwui-ink-dark">{o.count}</b>{` now, up from ${o.journey.start}. The aim is ${o.target}.`}</>)
                              : (<><b className="gwui-ink-dark">{o.count}</b>{` of ${o.target}.`}</>)}
                          </div>
                          <div className={`gwui-fs-13 ${o.delta > 0 ? 'gwui-ink-green' : 'gwui-ink-muted'}`} style={{fontWeight: 700, minWidth: 92, textAlign: 'right'}}>
                            {o.delta > 0 ? `Up ${o.delta} this session.` : 'No change.'}
                          </div>
                        </>
                      ) : (
                        <div className="gwui-fs-15 gwui-ink-muted" style={{minWidth: 92, textAlign: 'right'}}>No number is set yet.</div>
                      )}
                    </div>
                    {o.notSettled && (
                      <div className="gwui-fs-15 gwui-ink-amber gwui-mt-5" style={{lineHeight: 1.55, maxWidth: '68ch'}}>{o.notSettled}</div>
                    )}
                    {/* What the target assumes, the lead's lines from Context (U.7), under the number they qualify. */}
                    <WhatTheTargetAssumes
                      figure={o.target != null ? o.target.toLocaleString('en-GB') : null}
                      name={o.name}
                      assumes={o.assumes ?? []}
                    />
                      {/*
                        WORDS, NOT SYMBOLS. "-", "+" and "x" read as three unlabelled glyphs to
                        anybody looking at the screen, even though each already carried an
                        aria-label for a screen reader - an accessible name is not the same thing
                        as a word a sighted person can read.
                      */}
                      {b.canEditFrame && (
                        <span className="gwui-gap-6" style={{display: 'flex', alignItems: 'center'}}>
                          <UIButton
                            kind="secondary" size="small"
                            onClick={() => bumpObjective.mutate({ objectiveId: o.id, count: Math.max(0, o.count - 1) })}
                            disabled={(bumpObjective.isPending && bumpObjective.variables?.objectiveId === o.id) || o.count === 0}
                            aria-label={`One fewer: ${o.name}`}
                          >Lower</UIButton>
                          <UIButton
                            kind="secondary" size="small"
                            onClick={() => bumpObjective.mutate({ objectiveId: o.id, count: o.count + 1 })}
                            disabled={bumpObjective.isPending && bumpObjective.variables?.objectiveId === o.id}
                            aria-label={`One more: ${o.name}`}
                          >Raise</UIButton>
                          <UIButton
                            kind="quiet" danger size="small"
                            onClick={() => sureAboutTarget.arm(o.id)}
                            disabled={removeObjective.isPending}
                            aria-label={`Remove target: ${o.name}`}
                          >Remove</UIButton>
                        </span>
                      )}
                      {sureAboutTarget.isArmed(o.id) && (
                        <Confirm
                          saying={`Remove the target "${o.name}"? Its count and history go with it.`}
                          confirmLabel="Remove it" keepLabel="Keep it" pending={removeObjective.isPending} pendingLabel="Removing…"
                          onConfirm={() => removeObjective.mutate(o.id)} onKeep={sureAboutTarget.disarm}
                        />
                      )}
                    {/* The record suggests, the lead decides. Never auto-applied:
                        a number a person set is theirs until they change it. */}
                    {o.suggestedCount != null && b.canEditFrame && (
                      <div className="gwui-fs-15 gwui-ink-navy gwui-mt-6 gwui-gap-8" style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap'}}>
                        <span>
                          The record shows <b>{o.suggestedCount}</b> for this, not {o.count}.
                        </span>
                        {/* THE LINE IT CAME FROM, because a number from nowhere is one a lead has no
                            way to judge. Asking somebody to accept a figure without showing them
                            what it was read from is asking them to trust rather than to check. */}
                        {o.suggestedSaid && (
                          <span className="gwui-ink-sub" style={{display: 'block', width: '100%', fontStyle: 'italic'}}>
                            &ldquo;{o.suggestedSaid}&rdquo;
                          </span>
                        )}
                        <button
                          onClick={() => bumpObjective.mutate({ objectiveId: o.id, count: o.suggestedCount! })}
                          disabled={bumpObjective.isPending && bumpObjective.variables?.objectiveId === o.id}
                          className="gwui-fs-13 gwui-pt-2 gwui-pr-9 gwui-pb-2 gwui-pl-9 gwui-rule-blue gwui-ink-blue" style={{fontWeight: 700, borderRadius: 11, background: 'var(--gw-blue-bg)', cursor: 'pointer', fontFamily: 'inherit'}}
                        >
                          Use {o.suggestedCount}
                        </button>
                      </div>
                    )}
                    {/* A new target means nothing until people have checked in against it. */}
                    {o.isNew && o.askedOf && (
                      <div className="gwui-fs-13 gwui-ink-sub gwui-mt-6">
                        {(() => {
                          const asked = o.askedOf.filter((a) => a.asked).map((a) => a.name)
                          const notYet = o.askedOf.filter((a) => !a.asked).map((a) => a.name)
                          const askedSaid = asked.length ? `So far this has been asked of ${asked.join(', ')}.` : 'Nobody has been asked about this yet.'
                          return notYet.length ? `${askedSaid} It still needs to be asked of ${notYet.join(', ')}.` : askedSaid
                        })()}
                      </div>
                    )}
                  </div>
                )
              })}
              {/* The lead sets the frame. A target, never an assessment of a person. */}
              {b.canEditFrame && (
                <div className="gwui-panel-row gwui-gap-8" style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap'}}>
                  <input
                    value={newObjName}
                    onChange={(e) => setNewObjName(e.target.value)}
                    placeholder="Add a target, e.g. Paying companies"
                    className="gwui-pt-7 gwui-pr-10 gwui-pb-7 gwui-pl-10 gwui-fs-13-5 gwui-rule" style={{flex: 1, minWidth: 200, borderRadius: 7, fontFamily: 'inherit', outline: 'none'}}
                  />
                  <input
                    value={newObjTarget}
                    onChange={(e) => setNewObjTarget(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="how many"
                    className="gwui-pt-7 gwui-pr-10 gwui-pb-7 gwui-pl-10 gwui-fs-13-5 gwui-rule" style={{width: 96, borderRadius: 7, fontFamily: 'inherit', outline: 'none'}}
                  />
                  <UIButton
                    kind="primary" size="small"
                    onClick={() => addObjective.mutate()}
                    disabled={!newObjName.trim() || addObjective.isPending}
                  >
                    {addObjective.isPending ? 'Adding...' : 'Add target'}
                  </UIButton>
                </div>
              )}
            </Panel>
          </Section>
        )}

        {/*
          THE KIND OF WORK'S OWN RECORDS (request 76): deals and their stages, releases, tickets, a
          matter's deadlines and parties, and so on - one section per name the server sends under
          `workRecords`, in the switchboard's own order (Deal grid, Forecast, Themes, Work plan,
          Timeline, Obligations sit right after Targets in G2's own table). Drawn exactly as the
          server sends it: which sections exist, and whether each is filled, has none yet, or is not
          something Groundwork keeps for this kind of work, are all already decided server-side -
          this only draws what it is given. Only the lead may add, change or remove a record.
        */}
        <WorkRecordsSections
          groundId={id!}
          kindOfWork={(b as any).kindOfWork ?? null}
          sections={b.workRecords}
          participants={(b.participants ?? []).map((p) => ({ id: p.id, name: p.name }))}
          leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
          canEdit={b.canEditFrame}
        />

        {/* What was agreed at the start, so the rest of the board has something
            to be read against. This section has been in the DELIVERY family's
            list since the board was built with nothing behind it - so a lead saw
            where the work had got to and not what it was meant to be for. It is
            the only block here that no check-in can revise. */}
        {shown.startingState && b.startingState && (
          <Section heading="What was agreed at the start" note="Set when this was opened, before any check-in.">
            <Panel>
              <div className="gwui-fs-15 gwui-ink-dark" style={{lineHeight: 1.55}}>{b.startingState}</div>
            </Panel>
          </Section>
        )}

        {/*
          WHERE PEOPLE DIFFER, FIRST.

          It sat in "Against the plan", four zones and roughly two screens down, under the objectives
          and the check-in grid. A lead opens this board to find out where they need to step in, and
          the one section that tells them that was the last thing they reached; everything above it
          they could already guess.

          Moved, not changed. Same section, same rows, same order inside it. What follows it is
          unchanged too - "At a glance" still opens the zones, and the objectives and targets still
          lead "Against the plan" where the difference used to be.
        */}
        {shown.divergence && b.divergence && (
          <Section heading="Where people differ" note="Built from what each person said in their check-in.">
            <Panel pad={false}>
              {b.divergence.items.length === 0 && b.divergence.agreements.length === 0 ? (
                /* WHY IT IS EMPTY, NOT ONE SENTENCE FOR EVERY REASON. This said "This fills in once
                   more than one person has checked in" on a round where everybody had, three inches
                   under a tile that said so. The server computes it from the one counter. */
                <div className="gwui-panel-row"><div className="gwui-fs-15 gwui-ink-muted">{onlyOnePersonHere ? 'There is nothing to compare yet.' : (b.divergence.whyNothingYet ?? 'There is nothing to compare yet. This fills in once more than one person has answered.')}</div></div>
              ) : (
                <>
                  {b.divergence.items.map((d: any, i: number) => (
                    <div key={i} className="gwui-panel-row">
                      {/*
                        A TAG GLUED TO THE SENTENCE BEFORE IT. "...12 shops.agreed" read on a live
                        board: the pill sat right after the topic with only a CSS margin between
                        them, which is invisible to a screen reader and to anybody copying the text.
                        The kind is said as its own sentence now, on its own line.
                      */}
                      <div className="gwui-fs-16 gwui-ink-dark" style={{fontWeight: 600}}>
                        {d.topic ?? d.tag ?? 'Somewhere you see it differently'}
                      </div>
                      <div className="gwui-fs-15 gwui-ink-amber gwui-mt-2">{whoSeesThisDifferently(d.positions, myName)}</div>
                      {d.text && <div className="gwui-fs-15 gwui-ink-sub gwui-mt-3">{d.text}</div>}
                      {/*
                        WHAT EACH ACCOUNT ACTUALLY SAID, WHICH THE BOARD USED TO SEND YOU ELSEWHERE FOR.

                        This section carried a headline and then a line of italics: "This is the
                        summary. Your own report holds the detail of what each account said." So the
                        one question the board exists to answer - what do the two of you each think
                        is going on - was the one thing you had to leave it to find out.

                        The data was already here. `divergence.items` is the report's own divergence
                        objects, sent whole, and every string in them has been through `named()` on
                        the way out - the same masking the rest of the board gets, so a reader who
                        may not see who somebody is does not learn it here. Rendering it is a read
                        of what was already on the wire, not a new disclosure.
                      */}
                      {/*
                        "Rukia Otieno - Rukia Otieno's opening brief..." read on a live board: the
                        name and what they said, joined with a dash, which reads as one run-on
                        clause rather than a name followed by their words. Stacked instead, the way
                        every other name-then-quote on this page is already shown.
                      */}
                      {Array.isArray(d.positions) && d.positions.length > 0 && (
                        <div className="gwui-gap-4 gwui-mt-6" style={{display: 'grid'}}>
                          {d.positions.map((pos: any, j: number) => (
                            <div key={j} className="gwui-fs-15 gwui-ink-text" style={{lineHeight: 1.55}}>
                              <div style={{fontWeight: 700}}>{pos.who ?? 'A colleague'}</div>
                              {pos.view && <div className="gwui-ink-sub">{pos.view}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      {/*
                        "WHY IT MATTERS If the delays..." read live as one run-on line: the caption
                        and the sentence shared a line with only a trailing space between them. The
                        caption is now its own line, like every other caption on this page.
                      */}
                      {d.atStake && (
                        <div className="gwui-fs-15 gwui-ink-sub gwui-mt-5" style={{lineHeight: 1.55}}>
                          <span className="gwui-fs-13 gwui-ink-subd gwui-mb-2" style={{letterSpacing: '.1px', fontWeight: 700, display: 'block'}}>Why it matters</span>
                          {d.atStake}
                        </div>
                      )}
                    </div>
                  ))}
                  {b.divergence.agreements.map((a: any, i: number) => (
                    <div key={`a${i}`} className="gwui-panel-row">
                      <div className="gwui-fs-16 gwui-ink-dark" style={{fontWeight: 600}}>
                        {typeof a === 'string' ? a : a.topic ?? 'Agreed'}
                      </div>
                      <div className="gwui-fs-15 gwui-ink-green gwui-mt-2">Everybody agrees on this.</div>
                    </div>
                  ))}
                </>
              )}
              {/*
                THE POINTER IS GONE BECAUSE THE DETAIL ARRIVED.

                It read "This is the summary. Your own report holds the detail of what each account
                said." That sentence was the only reason a fourth report surface had to exist: the
                board named the disagreement and then sent you to another page to find out what it
                was. Each account is now printed above, so the sentence would be sending people away
                from the thing they are already looking at.
              */}
            </Panel>
          </Section>
        )}

        {/*
          THE QUESTION STANDS ON ITS OWN, BECAUSE IT IS NOT ALWAYS ABOUT A DIFFERENCE.

          It was drawn as the last row INSIDE "Where people differ", which reads as a question about
          the difference above it - and on a round where nothing differed, that card says "nothing
          cross-referenced yet" and then asked a question about nothing.

          It is the same field the report and a party's shared picture draw, under one name now:
          three places had two names between them, so somebody who read the board and then their
          report saw what looked like two different things.
        */}
        {b.divergence?.centralQuestion && (
          <Panel>
            <WhatToSettleTogether question={b.divergence.centralQuestion} />
          </Panel>
        )}

        {shown.whatTheRoomIsAbout && (
          <Section heading="What people are after, and where" note="Built from what everybody said.">
            {b.whatTheRoomIsAboutNote && (
              <Panel><div className="gwui-fs-15 gwui-ink-sub">{b.whatTheRoomIsAboutNote}</div></Panel>
            )}
            {b.whatTheRoomIsAbout && (
              <div className={`gwui-gap-14 ${b.whatTheRoomIsAboutNote ? 'gwui-mt-14' : 'gwui-mt-0'}`} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))'}}>
                {/*
                  THE AIMS COME FIRST AND TAKE THE WIDTH THEY NEED. On a board where nobody set a
                  target, what each person is trying to do is the only thing there is to align on,
                  and it was showing nowhere. The count beside each aim is how many people hold it,
                  which is the whole point: an aim one person holds and an aim twenty hold are not
                  the same fact about a room.
                */}
                {/* The aims run the full width; Panel takes no style, so the span lives on a wrapper. */}
                <div style={{gridColumn: '1 / -1'}}>
                <Panel pad={false}>
                  <div className="gwui-pt-13 gwui-pr-15 gwui-pb-10 gwui-pl-15 gwui-fs-15 gwui-ink-dark gwui-rule-bottom" style={{fontWeight: 700}}>
                    What people are trying to do
                  </div>
                  <div className="gwui-pt-2 gwui-pr-15 gwui-pb-12 gwui-pl-15">
                    {b.whatTheRoomIsAbout.aims.length === 0 ? (
                      <div className="gwui-fs-15 gwui-ink-muted gwui-pt-10 gwui-pr-0 gwui-pb-10 gwui-pl-0">Nobody has said what they are after yet.</div>
                    ) : b.whatTheRoomIsAbout.aims.map((a) => (
                      <div key={a.aim} className="gwui-pt-10 gwui-pr-0 gwui-pb-10 gwui-pl-0 gwui-inner-row">
                        <div className="gwui-gap-10" style={{display: 'flex', alignItems: 'baseline'}}>
                          <div className="gwui-fs-16 gwui-ink-dark" style={{fontWeight: 600, flex: 1}}>{a.aim}</div>
                          <Tag>{a.held.length === 1 ? '1 person' : `${a.held.length} people`}</Tag>
                        </div>
                        <div className="gwui-fs-15 gwui-ink-sub gwui-mt-3" style={{lineHeight: 1.5}}>{a.held.join(', ')}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
                </div>
                {([['Places named', b.whatTheRoomIsAbout.places], ['What it is about', b.whatTheRoomIsAbout.things]] as const).map(([label, rows]) => (
                  <Panel key={label} pad={false}>
                    <div className="gwui-pt-13 gwui-pr-15 gwui-pb-10 gwui-pl-15 gwui-fs-15 gwui-ink-dark gwui-rule-bottom" style={{fontWeight: 700}}>{label}</div>
                    <div className="gwui-pt-2 gwui-pr-15 gwui-pb-12 gwui-pl-15">
                      {rows.length === 0 ? (
                        <div className="gwui-fs-15 gwui-ink-muted gwui-pt-10 gwui-pr-0 gwui-pb-10 gwui-pl-0">Nobody named one.</div>
                      ) : rows.map((r) => (
                        <div key={r.name} className="gwui-pt-9 gwui-pr-0 gwui-pb-9 gwui-pl-0 gwui-inner-row">
                          <div className="gwui-gap-10" style={{display: 'flex', alignItems: 'baseline'}}>
                            <div className="gwui-fs-16 gwui-ink-dark" style={{fontWeight: 600, flex: 1}}>{r.name}</div>
                            <Tag>{r.named.length}</Tag>
                          </div>
                          <div className="gwui-fs-15 gwui-ink-sub gwui-mt-3" style={{lineHeight: 1.5}}>{r.named.join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </Section>
        )}

        {shown.quickRead && b.quickRead && (
          <Section heading="The quick read" note="How much the team agrees, and how much the report can rely on.">
            {/*
              FOUR TILES BECOME FOUR SCREENS-FULL WHEN THE GRID COLLAPSES TO ONE COLUMN.

              `minmax(190px, 1fr)` puts one tile per row below about 400px, so the block a person
              is meant to GLANCE at became four bordered cards, each with a 24px serif number and a
              clause under it - about a phone screen and a half to read four short facts.

              The clause stays: a tile that is a label and a figure is a scoreboard, and the clause
              is the thing that stops it being one. What goes is the packaging. On a phone these
              are four rows of one card, the value beside its label rather than under it at display
              size, and the clause underneath in body text.
            */}
            {/*
              U.10: ONE ROW OF FOUR, NOT THREE PLUS ONE. `auto-fit, minmax(190px, 1fr)` let the
              browser decide how many tiles fit per row, and it wrapped to three-then-one at some
              widths the prototype always draws as a single row of four white tiles. A fixed
              four-column grid keeps them together; on a phone this still hands off to the list.
            */}
            <div
              className={onAPhone ? 'gw-qr-list gwui-rule gwui-pt-2 gwui-pr-14 gwui-pb-2 gwui-pl-14' : 'gwui-gap-10'}
              style={onAPhone ? { background: 'white', borderRadius: 12 } : { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
            >
              {/*
                U.10 RE-REVIEW ITEM 6: A SENTENCE, THE WAY U.9's tileSentence ALREADY DOES IT.
                "Differences / None / no disagreement, as the written report reads it" was a label,
                a bare value and a fragment, stacked - the same bug U.9's report review found and
                fixed with `tileSentence`, reused here rather than reworded: this is the same tile
                shape (label/value/sub), from the same server function (atAGlanceTiles). The label
                stays for a screen reader, without being shown as its own heading.
              */}
              {b.quickRead.map((q) => {
                const toneClass = q.tone === 'bad' ? 'gwui-ink-red' : q.tone === 'warn' ? 'gwui-ink-amber' : q.tone === 'good' ? 'gwui-ink-green' : 'gwui-ink-text'
                const said = tileSentence(q)
                return onAPhone ? (
                  <div key={q.label} className="gwui-pt-11 gwui-pr-0 gwui-pb-11 gwui-pl-0 gwui-inner-row">
                    <span className="gw-sr-only">{q.label}</span>
                    <div className={`gwui-fs-15 ${toneClass}`} style={{lineHeight: 1.5}}>{said}</div>
                  </div>
                ) : (
                  <div key={q.label} className="gwui-rule gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14" style={{background: 'white', borderRadius: 12}}>
                    <span className="gw-sr-only">{q.label}</span>
                    <div className={`gwui-fs-15 ${toneClass}`} style={{lineHeight: 1.5}}>{said}</div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}


        {/* ---------------------------------------------- at a glance */}
        {/* quickRead and startingState moved into the switchboard-ordered group above (item 2). */}

        {/*
          WHAT THE ANSWERS SAY, ABOVE WHO HAS NOT GIVEN ONE.
          
          Hafsah, 23 September 2026, on a hundred-person board: "the reports and boards needs to
          show more reasoning, they look more like things that just do counts." The page opened on a
          hundred identical rows saying somebody had not answered, and said nothing at all about
          what the people who HAD answered said. The read exists - see WhatTheNetworkSaid - and it
          belongs on the page somebody opens to see how this is going, not only on the report.
        */}
        {/*
          EITHER READ IS ENOUGH TO OPEN THIS BAND.

          Gating both on the network read would hide the judgement on every check-in too small for
          one - the network read needs eight accounts before it says anything - and the judgement is
          arithmetic over whatever has been answered, so it is there long before that. A band that
          appears only once the bigger of its two reads exists is a band nobody sees first.
        */}
        {/*
          AND WHAT THE RECORD SHOWS ACROSS EVERY SESSION, ABOVE BOTH.

          The judgement reads this round's answers. This reads the whole run - promises and whether
          they came back, who is waiting on whom, what has been seen often enough to be a pattern,
          and each role beside what the record holds about it. A founder deciding about somebody
          needs the run, not the round, and three of these sections were empty in the report on the
          one engagement that was entirely about them. Its own band, because it is on its own
          timescale.
        */}
        {(b as any).overTime && (
          <Section heading="What the record shows" note="Read across every session so far.">
            <WhatTheRecordShows it={(b as any).overTime} />
          </Section>
        )}

        {((b as any).whatTheAnswersSay || (b as any).theJudgement) && (
          <Section heading="What the answers say" note="Built from everybody who has answered so far.">
            {/*
              THE JUDGEMENT FIRST, THEN WHAT PEOPLE SAID.

              "The report did not put things into buckets, do clear synthesis." The network read
              below this is what everybody said, grouped. This is what it means, what to do about it,
              and what it cannot tell you - which is the thing a reader opens a board for. A summary
              above the detail, the way every other read on this page is arranged.

              U.10 (c1): the heading above is the shared Section's; TheJudgement and WhatTheNetworkSaid
              are the engine's own synthesis components and are left exactly as they render today.
            */}
            <TheJudgement it={(b as any).theJudgement} />
            {(b as any).whatTheAnswersSay && <WhatTheNetworkSaid picture={(b as any).whatTheAnswersSay} />}
          </Section>
        )}

        {shown.eachPerson && (
          <Section heading="The team today" note="Each person’s line, their last 10 check-ins, and what keeps coming up.">
            {/*
              U.10: "THE TEAM TODAY", THE PROTOTYPE'S WORDING (board-as-lead.txt).
              The rows are still ordered by what needs the lead first, not listed by name - that
              ordering is unchanged, only the heading now reads as the prototype's screen does.
            */}
            <WhereEachPersonIs rows={eachPersonRows} squaresFor={squaresFor} />
          </Section>
        )}

        {/*
          WHAT THE CHECK-INS ASKED FOR AND DID NOT GET.

          The conversation asks twice and then lets it go, rather than pressing somebody who has
          already declined twice. Somebody has to see the gap, and it is you. It is not a mark
          against anybody: half the time the honest reason is that nobody could have answered -
          a target nobody set, a dependency nobody owns.
        */}
        {!!b.stillUnanswered?.length && (
          <Section heading="Asked for, not answered" note="The check-in asked twice, then stopped.">
            <Panel pad={false}>
              {b.stillUnanswered.map((g) => (
                <div key={`${g.who}-${g.what}`} className="gwui-panel-row">
                  <div className="gwui-gap-12" style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap'}}>
                    <span className="gwui-fs-16 gwui-ink-dark">
                      <b style={{fontWeight: 700}}>{g.who}</b> &mdash; {g.what}
                    </span>
                    <span className="gwui-fs-13-5 gwui-ink-sub" style={{whiteSpace: 'nowrap'}}>
                      {/* Some of these cannot be confirmed either way - the check-in asked and
                          nothing on the record can prove the answer. Saying "they did not answer"
                          about somebody who answered in their first sentence would be worse than
                          saying nothing. */}
                      {g.certain ? `open since session ${g.sinceRound}` : `asked in session ${g.sinceRound}, could not confirm`}
                    </span>
                  </div>
                </div>
              ))}
            </Panel>
          </Section>
        )}

        {shown.decisions && b.decisions && (
          <Section heading="Decisions needed" note="Raised by what people see differently, or what is stuck.">
            <Panel pad={false}>
              {b.decisions.map((d, i) => (
                <div key={i} className="gwui-panel-row">
                  <div className="gwui-gap-11" style={{display: 'flex', alignItems: 'baseline'}}>
                    <span className="gwui-fs-17 gwui-ink-navy" style={{fontFamily: 'var(--gw-font-name)', minWidth: 18}}>{i + 1}</span>
                    <div style={{flex: 1}}>
                      <div className="gwui-ink-dark gwui-fs-16" style={{fontWeight: 600}}>{d.question}</div>
                      <div className="gwui-fs-15 gwui-ink-muted gwui-mt-2">{d.why}</div>
                    </div>
                    {/* U.10: a name, not a verdict - the owner is who this is for, not a label on them. */}
                    <span className="gwui-fs-13-5 gwui-ink-sub" style={{whiteSpace: 'nowrap'}}>{d.owner}</span>
                  </div>
                </div>
              ))}
            </Panel>
          </Section>
        )}

        {/* ---------------------------------------------- against the plan */}





        {/* ---------------------------------------------- the work */}


        {shown.whoOwnsWhat && b.whoOwnsWhat && (
          /* AN UPDATE HAS NO OWNERSHIP TO READ. Its per-person cards are the answers to the lead's one line. */
          <Section
            heading={b.family === 'UPDATE' ? 'What each person said' : 'Who owns what'}
            note={b.family === 'UPDATE' ? 'Their own answers to the question, in their words.' : 'Read from what people said in their check-ins.'}
          >
            <div className="gwui-gap-14" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))'}}>
              {b.whoOwnsWhat.map((p) => (
                <Panel key={p.participantId} pad={false}>
                  <div className="gwui-pt-13 gwui-pr-15 gwui-pb-10 gwui-pl-15 gwui-rule-bottom">
                    {/*
                      The server falls back from a missing name to the ROLE rather than the email
                      address (W-UX-4), so the subtitle has to stop repeating it - otherwise a person
                      with no account yet reads "Engineer" over "Engineer".
                    */}
                    <div className="gwui-fs-15 gwui-ink-dark" style={{fontWeight: 700}}>{nameOnTheBoard(b, p.participantId, p.name)}</div>
                    {p.role && p.role !== p.name && <div data-leads-note className="gwui-fs-13-5 gwui-ink-sub gwui-mt-1">{theLeadsNote(p.role)}</div>}
                  </div>
                  <div className="gwui-pt-2 gwui-pr-15 gwui-pb-10 gwui-pl-15">
                    {(() => { const said = p.items.filter((it) => theWordsOfALine(it.text)); return said.length === 0 ? (
                      <div className="gwui-fs-15 gwui-ink-muted gwui-pt-10 gwui-pr-0 gwui-pb-10 gwui-pl-0">{b.family === 'UPDATE' ? 'Has not answered yet.' : 'Nobody has said anything about this yet.'}</div>
                    ) : said.map((it) => (
                      <div key={it.id} className="gwui-pt-10 gwui-pr-0 gwui-pb-10 gwui-pl-0 gwui-inner-row">
                        <div className="gwui-fs-15" style={{lineHeight: 1.45}}>{theWordsOfALine(it.text)}</div>
                        <div className="gwui-mt-4 gwui-gap-6" style={{display: 'flex', alignItems: 'baseline', flexWrap: 'wrap'}}>
                          {/*
                            RECORD TYPES ARE THE GOAL VOCABULARY, SAID AS A SENTENCE. "success
                            definition", "commitment", "intent" and "progress" as bare tags are the
                            record's own internal words, printed at somebody rather than explained
                            to them. The lookup is the record type; the reader gets a sentence.
                          */}
                          {b.family !== 'UPDATE' && WHAT_THIS_ITEM_IS[it.type] && (
                            <span className="gwui-fs-13 gwui-ink-sub">{WHAT_THIS_ITEM_IS[it.type]}</span>
                          )}
                          {it.sessionNumber && <span className="gwui-fs-13 gwui-ink-muted">Said in session {it.sessionNumber}.</span>}
                        </div>
                      </div>
                    )) })()}
                  </div>
                </Panel>
              ))}
            </div>
          </Section>
        )}

        {shown.dependencies && b.dependencies && (
          <Section heading="Waiting on" note="Handoffs between people, read from their check-ins.">
            {/*
              U.10: ONE CARD PER BLOCKER, THE PROTOTYPE'S LAYOUT (board-as-lead.jpg, "Blockers").
              Each blocker there is its own white card: a bold title, an outlined status pill top
              right, then "Waiting on:", "Raised:", "Affects:", "Promised", "What the proof shows"
              and a light-blue "Would clear it:" bar. `Dependency` only carries `from`, `what`, `on`,
              `status` and `then` - so this draws the columns that data supports (title, the status
              pill with the prototype's border, "Waiting on:") and keeps the sentence and the
              "then" quote this board already had, rather than inventing the missing fields. Raised
              (with dates), Affects, Promised and What the proof shows are requested in
              docs/requests-to-engine.md.

              Nothing to offer in the empty state, so it says where this comes from instead. A
              handoff is extracted from what people say in their check-ins - there is no button that
              would produce one, and an empty state implying otherwise would send somebody looking
              for it. W8-24.
            */}
            {b.dependencies.length === 0 ? (
              <Panel><div className="gwui-fs-15 gwui-ink-sub" style={{lineHeight: 1.6}}>Nothing here yet. Handoffs appear when somebody says in a check-in that they are waiting on another person.</div></Panel>
            ) : (
              <div className="gwui-gap-10" style={{display: 'flex', flexDirection: 'column'}}>
                {b.dependencies.filter((d) => (d.what ?? '').trim().toLowerCase() !== (d.on ?? '').trim().toLowerCase()).map((d) => {
                  const onWhom = d.on ?? 'someone outside this check-in'
                  const statusSaid = d.status === 'BLOCKING' ? 'This is blocking work.' : d.status === 'CLEARED' ? 'This is cleared.' : 'This is waiting.'
                  const title = d.what ? d.what.charAt(0).toUpperCase() + d.what.slice(1) : 'Waiting on something'
                  const tone: TagTone = d.status === 'BLOCKING' ? 'concern' : d.status === 'CLEARED' ? 'proven' : 'attention'
                  const word = d.status === 'BLOCKING' ? 'Blocking' : d.status === 'CLEARED' ? 'Cleared' : 'Waiting'
                  return (
                    <Panel key={d.id}>
                      <div className="gwui-gap-10" style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                        <div className="gwui-fs-16 gwui-ink-dark" style={{fontWeight: 700}}>{title}</div>
                        <Tag tone={tone}>{word}</Tag>
                      </div>
                      <div className="gwui-fs-13-5 gwui-ink-sub gwui-mt-8">
                        Waiting on: <span className="gwui-ink-dark" style={{fontWeight: 600}}>{onWhom}</span>
                      </div>
                      <div className="gwui-fs-15 gwui-ink-dark gwui-mt-4" style={{lineHeight: 1.5}}>
                        <b>{d.from}</b> needs {d.what} from <b>{onWhom}</b>. {statusSaid}
                      </div>
                      {d.then && (
                        <div className="gwui-rule-blue gwui-pt-8 gwui-pr-10 gwui-pb-8 gwui-pl-10 gwui-mt-8 gwui-fs-15 gwui-ink-text" style={{background: 'var(--gw-blue-bg)', borderRadius: 8, lineHeight: 1.5}}>
                          When this arrives, {d.from} says: “{String(d.then).replace(/[.\s]+$/, '')}.”
                        </div>
                      )}
                    </Panel>
                  )
                })}
              </div>
            )}
          </Section>
        )}

        {/* Links between check-ins (D3, U.16): drawn only when the server serves this reader any. */}
        {id && <CheckInLinks groundId={id} label={(groundForSignals as any)?.label ?? null} />}

        {shown.checkInGrid && b.checkInGrid && (() => {
          /** Does any row have a role worth a column of its own? */
          const anyRoleToShow = b.checkInGrid.rows.some((r) => (r.role && r.role !== r.name) || r.managingOnly)
          /*
           * ITEM E: A SESSION THAT HAS NOT OPENED IS NOT THE SAME "-" AS ONE SOMEBODY WAS SIMPLY
           * NOT ON. A bare dash read the same for both, and for a session with nothing to say about
           * it yet at all. Cross-referenced against the phase spine's own state, so an unopened
           * session's cell is blank with an accessible "Not open yet" rather than a dash.
           */
          const sessionState = new Map((b.phaseSpine?.sessions ?? []).map((ps) => [ps.n, ps.state]))
          /*
           * U.10: "WHO CHECKED IN", THE PROTOTYPE'S WORDING AND SHAPE (board-as-lead.txt: "Who
           * checked in / The last 10 sessions, one row each"). The prototype draws this as a
           * name and a row of ten navy squares - not a table with a "Session N" header per column.
           * Squares come from `squaresFor`, the same helper "The team today" uses, so both read the
           * same checkInGrid data the same way. The role column (not in the prototype, but real
           * data this board already had - "managing only", or a role standing in for a name nobody
           * gave) is kept so nothing here is lost, just moved beside the name instead of its own
           * header.
           */
          return (
            <Section heading="Who checked in" note="The last 10 sessions, one row each.">
              {/*
                A GRID OF PEOPLE BY SESSIONS IS THE RIGHT SHAPE UNTIL THE SCREEN IS NARROWER THAN
                IT IS. Measured on the running board at 375px: 1088px of table inside a 301px box,
                nine pills behind a scrollbar, names wrapping to two lines to make room for it.
                The phone gets the same facts down the page instead - see the component.
              */}
              {onAPhone ? (
                <NineColumnsIsNotAPhoneScreen
                  rows={b.checkInGrid.rows.map((r) => ({ ...r, name: nameOnTheBoard(b, r.participantId, r.name) })) as any}
                  sessions={b.checkInGrid.sessions}
                  openSessions={b.checkInGrid.sessions.filter((s) => sessionState.get(s) !== 'upcoming')}
                />
              ) : (
                /*
                  U.10 (c2): FROM THE SHARED PARTS. A PeopleTable of PersonRows, the same shape
                  "The team today" uses - name (and, where a role is worth its own column, the
                  lead's note or "Managing only" as the level line), then the same ten squares
                  "The team today" draws, from the same `squaresFor` helper, in their own
                  fixed-width column so they line up across every row.
                */
                <PeopleTable>
                  {b.checkInGrid.rows.map((r) => (
                    <PersonRow
                      key={r.participantId}
                      extraColumns="190px"
                      person={{
                        initials: initialsOf(nameOnTheBoard(b, r.participantId, r.name)),
                        name: nameOnTheBoard(b, r.participantId, r.name),
                        level: anyRoleToShow && (r.role && r.role !== r.name || r.managingOnly)
                          ? (r.role && r.role !== r.name ? <span data-leads-note>{theLeadsNote(r.role)}</span> : 'Managing only')
                          : undefined,
                      }}
                    >
                      <div className="gwui-gap-5" style={{display: 'flex', justifyContent: 'flex-end'}}>
                        {squaresFor(r.participantId).map((sq) => (
                          <span
                            key={sq.key}
                            aria-label={sq.state === 'upcoming' ? 'Not open yet' : sq.state === 'done' ? 'Checked in' : 'Missed'}
                            title={sq.state === 'upcoming' ? 'Not open yet' : sq.state === 'done' ? 'Checked in' : 'Missed'}
                            className={sq.state === 'empty' ? 'gwui-rule-square' : undefined}
                            style={{display: 'inline-block', width: 14, height: 14, borderRadius: 3, flexShrink: 0, background: sq.state === 'done' ? 'var(--gw-navy)' : 'transparent'}}
                          />
                        ))}
                      </div>
                    </PersonRow>
                  ))}
                </PeopleTable>
              )}
            </Section>
          )
        })()}

        {/* ---------------------------------------------- contribution and fairness */}

        {/*
          WHY THIS HALF OF THE BOARD IS SHORTER FOR SOME PEOPLE.

          On an evaluation-family ground the parties give their accounts without seeing each other,
          and the board now keeps that wall - a party gets their own row and nobody else's, where
          before they got every colleague's name and the read on their quarter. Without a line
          saying so, a board that has quietly lost most of itself reads as broken, or as though
          nobody else is in the check-in.

          The server decides and sends the sentence; this renders it. A rule the client worked out
          for itself would be a second copy of the rule, and the wrong one to get wrong.
        */}
        {(b as any).whyYouOnlySeeYourself && (
          <div className="gwui-fs-13-5 gwui-ink-sub gwui-rule gwui-pt-11 gwui-pr-13 gwui-pb-11 gwui-pl-13 gwui-mb-10" style={{lineHeight: 1.6, background: 'var(--gw-bg)', borderRadius: 8, maxWidth: 620}}>
            {(b as any).whyYouOnlySeeYourself}
          </div>
        )}

        {shown.contribution && b.contribution && (
          <Section heading="Contribution against role" note="Measured against each person’s own role.">
            <Panel>
              <div className="gwui-fs-15 gwui-ink-sub gwui-pt-6 gwui-pr-0 gwui-pb-2 gwui-pl-0">
                Is the role clear, and what does the record actually hold for each person, read in their own function's terms.
              </div>
              {/*
                THE SAME PARAGRAPH THREE TIMES IS A MAIL MERGE. When nobody's role is defined the note
                is one fact about the check-in, said once; and a party with no name and nothing on
                record gets no card, because a card for nobody says nothing.
              */}
              {b.contribution.every((c) => !c.remitDefined) && b.contribution.length > 1 ? (
                <div className="gwui-rule gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14 gwui-mt-9" style={{borderRadius: 12, background: 'var(--gw-bg)'}}>
                  <div className="gwui-gap-9" style={{display: 'flex', alignItems: 'baseline', flexWrap: 'wrap'}}>
                    <span className="gwui-ink-dark gwui-fs-14" style={{fontWeight: 700}}>Everyone here</span>
                    <span className="gwui-fs-13-5 gwui-ink-amber" style={{fontWeight: 600}}>no role clearly defined yet</span>
                  </div>
                  <div className="gwui-fs-15 gwui-ink-navy gwui-rule-blue gwui-pt-8 gwui-pr-10 gwui-pb-8 gwui-pl-10 gwui-mt-8" style={{background: 'var(--gw-blue-bg)', borderRadius: 9, lineHeight: 1.5}}>
                    {b.contribution[0].note}
                  </div>
                </div>
              ) : b.contribution.filter((c) => c.name || c.remitDefined).map((c) => (
                <div key={c.participantId} className="gwui-rule gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14 gwui-mt-9" style={{borderRadius: 12, background: 'var(--gw-bg)'}}>
                  <div className="gwui-gap-9" style={{display: 'flex', alignItems: 'baseline', flexWrap: 'wrap'}}>
                    <span className="gwui-ink-dark gwui-fs-14" style={{fontWeight: 700}}>{nameOnTheBoard(b, c.participantId, c.name)}</span>
                    {/* "Your note" to the lead who wrote it, never to an admin (U.7 review). */}
                    {c.remitDefined
                      ? (b.canEditFrame && c.remit ? <span data-leads-note className="gwui-fs-13-5 gwui-ink-sub">{theLeadsNote(c.remit)}</span> : null)
                      : <span className="gwui-fs-13-5 gwui-ink-amber" style={{fontWeight: 600}}>role not clearly defined</span>}

                  </div>

                  {/* An undefined remit shows NO position. You cannot measure someone
                      against a bar that was never set. */}
                  {c.shown === false && c.remitDefined ? (
                    /* Too little on record to say anything about a person yet. A
                       hedge still reads as a verdict, so nothing is shown at all. */
                    <div className="gwui-fs-15 gwui-ink-muted gwui-mt-8" style={{lineHeight: 1.45, fontStyle: 'italic'}}>
                      Not enough on record yet to say anything about this person's contribution. {c.basis}
                    </div>
                  ) : !c.remitDefined ? (
                    <div className="gwui-fs-15 gwui-ink-navy gwui-rule-blue gwui-pt-8 gwui-pr-10 gwui-pb-8 gwui-pl-10 gwui-mt-8" style={{background: 'var(--gw-blue-bg)', borderRadius: 9, lineHeight: 1.45}}>
                      {c.note}
                    </div>
                  ) : (
                    <>
                      {/* A position is never shown without its reason. */}
                      <div className="gwui-mt-7 gwui-fs-15" style={{lineHeight: 1.45}}>
                        {c.reason}
                      </div>
                      {c.basis && (
                        <div className="gwui-mt-6 gwui-fs-13 gwui-ink-muted" style={{lineHeight: 1.45}}>
                          {c.basis}
                        </div>
                      )}
                      {c.fnLabel && (
                        <div className="gwui-mt-6 gwui-gap-6" style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap'}}>
                          <Tag tone="action">read as {c.fnLabel.toLowerCase()}</Tag>
                          {!c.fnConfident && <span className="gwui-fs-13 gwui-ink-muted" style={{fontStyle: 'italic'}}>still provisional</span>}
                          {c.isBlocked && <Tag tone="attention">part of this is blocked</Tag>}
                        </div>
                      )}
                      <div className={`gwui-mt-8 gwui-fs-15 gwui-pt-6 gwui-pr-10 gwui-pb-6 gwui-pl-10 ${c.ownVoice ? 'gwui-ownvoice' : 'gwui-ownvoice-none'}`} style={{lineHeight: 1.4, borderRadius: 9, fontStyle: c.ownVoice ? 'normal' : 'italic'}}>
                        {c.ownVoice ?? 'No note. This person can add their own context through their next check-in.'}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {b.contribution[0]?.guard && (
                <div className="gwui-fs-13-5 gwui-ink-muted gwui-mt-11 gwui-pt-9 gwui-rule-top-dashed" style={{fontStyle: 'italic', lineHeight: 1.5}}>
                  {b.contribution[0].guard}
                </div>
              )}
            </Panel>
          </Section>
        )}

        {shown.coverage && b.coverage && (
          <Section heading="Where work is landing" note="Whose work is landing where.">
            <Panel>
              <div className="gwui-fs-15 gwui-ink-sub gwui-pt-6 gwui-pr-0 gwui-pb-2 gwui-pl-0">
                A drop in ownership shows up as your responsibilities landing more and more in what other people describe as theirs.
                Rising is the early warning, often before targets are missed, because the work still gets done, by someone else.
              </div>

              {/* Both variants ship so the "does a bar read as a verdict" question
                  gets answered by real use rather than a guess. */}
              <div className="gwui-gap-6 gwui-mt-8 gwui-mr-0 gwui-mb-4 gwui-ml-0" style={{display: 'flex', alignItems: 'center'}}>
                <span className="gwui-fs-13 gwui-ink-muted" style={{fontWeight: 700, letterSpacing: '.1px'}}>Showing</span>
                {(['text', 'bar'] as CoverageVariant[]).map((v) => (
                  <button key={v} onClick={() => setVariant(v)} className={`gwui-fs-13 gwui-pt-3 gwui-pr-10 gwui-pb-3 gwui-pl-10 ${b.coverageVariant === v ? 'gwui-toggle-chip-on' : 'gwui-toggle-chip-off'}`} style={{fontWeight: 700, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit'}}>{v === 'text' ? 'words only' : 'with a bar'}</button>
                ))}
              </div>

              {b.coverage.reads.filter((r) => r.shown !== false).map((r) => (
                <div key={r.participantId} className="gwui-rule gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14 gwui-mt-9" style={{borderRadius: 12, background: 'var(--gw-bg)'}}>
                  <div className="gwui-gap-9" style={{display: 'flex', alignItems: 'baseline', flexWrap: 'wrap'}}>
                    <span className="gwui-ink-dark gwui-fs-14" style={{fontWeight: 700}}>{nameOnTheBoard(b, r.participantId, r.name)}</span>
                    {/* "ROLE LEVEL" read as a heading over a single word; it is a small note beside
                        the name, not a section of its own, so it no longer renders in capitals. */}
                    <span className="gwui-fs-13 gwui-ink-muted">at {r.scope} level</span>
                    <span className="gwui-ml-auto">
                      <Tag tone={r.kind === 'LEAKING' ? 'attention' : r.kind === 'ABSORBING' ? 'action' : 'plain'}>
                        {r.kind === 'LEAKING' ? 'Landing with others' : r.kind === 'ABSORBING' ? "Taking on others' work" : 'Staying with them'}
                      </Tag>
                    </span>
                  </div>

                  {b.coverageVariant === 'bar' && r.remitDefined && (
                    <div className="gwui-mt-9" style={{height: 7, borderRadius: 6, background: '#D6DBEA', overflow: 'hidden'}}>
                      <div style={{height: '100%', width: `${r.pct}%`, borderRadius: 6, background: r.kind === 'LEAKING' ? 'var(--gw-amber-b)' : r.kind === 'ABSORBING' ? 'var(--gw-navy)' : 'var(--gw-muted)'}} />
                    </div>
                  )}

                  {/* "WHAT PEOPLE SAID The role..." read live as one run-on line, the same bug as
                      "Why it matters" above. Its own line now. */}
                  <div className="gwui-mt-8 gwui-fs-15" style={{lineHeight: 1.45}}>
                    <span className="gwui-fs-13 gwui-ink-subd gwui-mb-2" style={{letterSpacing: '.1px', fontWeight: 700, display: 'block'}}>What people said</span>
                    {r.what}
                  </div>

                  {/* The signal is ALWAYS coupled to the reason it cannot self-determine. */}
                  <div className="gwui-mt-7 gwui-fs-15 gwui-rule gwui-pt-7 gwui-pr-10 gwui-pb-7 gwui-pl-10" style={{lineHeight: 1.4, background: 'white', borderRadius: 9}}>
                    <span className="gwui-fs-13 gwui-ink-subd gwui-mb-2" style={{letterSpacing: '.1px', fontWeight: 700, display: 'block'}}>
                      Which of these this is
                    </span>
                    {r.reasonText}
                  </div>

                  {r.basis && (
                    <div className="gwui-mt-6 gwui-fs-13 gwui-ink-muted" style={{lineHeight: 1.45}}>{r.basis}</div>
                  )}

                  <div className="gwui-mt-7 gwui-fs-15 gwui-rule-dashed gwui-pt-6 gwui-pr-10 gwui-pb-6 gwui-pl-10 gwui-ink-muted" style={{lineHeight: 1.4, borderRadius: 9, fontStyle: 'italic'}}>
                    {r.ownVoice ?? 'No note. This person can add context through their next check-in.'}
                  </div>
                </div>
              ))}

              {b.coverage.reads.some((r) => r.shown === false) && (
                <div className="gwui-fs-13-5 gwui-ink-muted gwui-mt-9" style={{lineHeight: 1.45}}>
                  {b.coverage.reads.filter((r) => r.shown === false).map((r) => r.name).join(', ')} {b.coverage.reads.filter((r) => r.shown === false).length === 1 ? 'is' : 'are'} not shown here yet. There is too little on record to say anything about where their work is landing, and a guess about that would be worse than a gap.
                </div>
              )}

              <div className="gwui-fs-13-5 gwui-ink-muted gwui-mt-11 gwui-pt-9 gwui-rule-top-dashed" style={{fontStyle: 'italic', lineHeight: 1.5}}>
                Other people doing your work can mean several different things. Nobody may own it any more, and others are quietly
                covering the gap. It may be healthy work shared by design. You may be blocked or carrying too much. Or someone else may
                be taking over your role without being asked to. This shows the signal, but it cannot tell which of these is happening on
                its own, so it is shown alongside what you are waiting on, how clearly your role is defined, and your own voice. It never
                concludes that you have stopped contributing. It raises a question for the team to discuss, never a verdict about a
                person. It is only shown where the role is defined, because an undefined boundary has no coverage to measure.
              </div>
            </Panel>
          </Section>
        )}

        {/*
         * HOW THE LEADING IS LANDING: PROTECTED (Hafsah, 29 September). Patterns, role behaviour,
         * coaching and the probe structure are never removed, hidden or simplified to solve a
         * problem; something wrong is fixed in place, or shown only to the most private reader. This
         * used to be hidden whenever patterns were off, because its count said "seen across 2
         * sessions" after one. It is now always drawn for the person who runs the check-in, and only
         * for them, and the count is fixed in place: `seenAcross` says it only when that many
         * sessions have actually happened here.
         */}
        {viewerRunsThisCheckIn && b.managerAlignment && b.managerAlignment.length > 0 && (
          <Section heading="How the leading is landing" note="Two sides of the same leadership.">
            <Panel pad={false}>
              <div className="gwui-fs-15 gwui-ink-sub gwui-pt-16 gwui-pr-22 gwui-pb-2 gwui-pl-22">
                Where one person's read of how this team is being led differs from another's. Neither is called wrong.
              </div>
              {b.managerAlignment.map((m, i) => (
                <div key={i} className="gwui-panel-row">
                  <div className="gwui-gap-8" style={{display: 'flex', alignItems: 'baseline', flexWrap: 'wrap'}}>
                    <span className="gwui-fs-16 gwui-ink-dark" style={{fontWeight: 600}}>{m.label}</span>
                    {/* The pole matters more than the gap: holding on to everything
                        and holding nobody need opposite responses, and telling one
                        to do the other makes it worse. */}
                    {m.pole !== 'NEITHER' && (
                      <Tag tone="action">
                        {m.pole === 'CONTROL' ? 'nobody else gets to own it' : 'nobody is being held to it'}
                      </Tag>
                    )}
                    {seenAcross(m.periods, b.phaseSpine?.currentSession ?? null) && (
                      <span className="gwui-fs-13 gwui-ink-muted gwui-ml-auto">
                        {seenAcross(m.periods, b.phaseSpine?.currentSession ?? null)}
                      </span>
                    )}
                  </div>
                  <div className="gwui-fs-15 gwui-ink-text gwui-mt-4" style={{lineHeight: 1.45}}>{m.gap}</div>
                  <div className="gwui-fs-15 gwui-ink-sub gwui-mt-4" style={{lineHeight: 1.45}}>{m.note}</div>
                </div>
              ))}
              <div className="gwui-fs-13-5 gwui-ink-muted gwui-pt-10 gwui-pr-22 gwui-pb-16 gwui-pl-22 gwui-rule-top-dashed gwui-mt-4" style={{fontStyle: 'italic', lineHeight: 1.5}}>
                Neither read is called wrong. Something can be set clearly and still not land, and both people can be describing
                their own experience honestly. This shows that two sides of the same leadership differ, never who said what, and it
                is a prompt for a conversation rather than a finding about anyone.
              </div>
            </Panel>
          </Section>
        )}

        {/* ---------------------------------------------- the record over time */}
        {/*
          SOMEBODY CARRYING WORK WITH NO ACCOUNT HERE.

          Above the record-over-time zone, because it is about who is in this rather than about
          what has happened in it - and because a reader who is about to decide something should
          know first that somebody it touches cannot answer back.

          The server sends nothing unless a row survived the guard, so there is no empty state
          here and no branch for one.
        */}
        {shown.hiddenContributors && b.hiddenContributors && (
          <Section heading="Named here, and not in this check-in" note="Built from what people said.">
            <Panel pad={false}>
              {b.hiddenContributors.rows.map((r, i) => (
                <div key={r.label + i} className="gwui-panel-row">
                  <div className="gwui-fs-16 gwui-ink-text gwui-mb-4" style={{fontWeight: 600}}>{r.label}</div>
                  <div className="gwui-fs-15 gwui-ink-sub" style={{lineHeight: 1.55}}>{r.evidence}</div>
                </div>
              ))}
              <div className="gwui-panel-row">
                <div className="gwui-fs-15 gwui-ink-sub" style={{lineHeight: 1.6}}>{b.hiddenContributors.why}</div>
              </div>
            </Panel>
          </Section>
        )}


        {shown.patterns && b.patterns && (
          <>
            {/*
              WHAT KEEPS COMING UP (board-as-lead.txt). Named after three check-ins in a row, never
              after one, and each one describes the work - never a label joined to a name (see
              api/src/modules/patterns/who-reads-a-pattern.ts, the one place that decides who reads
              a pattern and in what words). `visiblePatterns` is filtered again here for a colleague,
              on top of what the server already withheld: see the comment on `visiblePatterns` above.
            */}
            <Section heading="What keeps coming up" note="Named after three check-ins in a row, never after one. Each describes the work.">
              <Panel pad={false}>
                {visiblePatterns.length === 0 ? (
                  <div className="gwui-panel-row"><div className="gwui-fs-15 gwui-ink-muted">Nothing to show here yet. A pattern appears only after three check-ins in a row, and the person it is about always sees it first.</div></div>
                ) : (
                  <>
                    <div className="gwui-panel-row">
                      <div className="gwui-fs-13-5 gwui-ink-dark" style={{fontWeight: 700}}>About each person’s work</div>
                    </div>
                    {visiblePatterns.map((p) => (
                      <div key={p.id} className="gwui-panel-row">
                        <PatternPanel
                          pattern={p}
                          invalidateKey={['board', id]}
                          name={patternPersonName(p.participantId, p.yours)}
                        />
                      </div>
                    ))}
                  </>
                )}
                <div className="gwui-fs-13-5 gwui-ink-muted gwui-pt-10 gwui-pr-22 gwui-pb-10 gwui-pl-22 gwui-rule-top-dashed gwui-mt-4" style={{fontStyle: 'italic', lineHeight: 1.5}}>
                  Patterns about the work only. Anything that would read as a judgement about a person stays in the lead's private report and never appears here.
                </div>
              </Panel>
            </Section>
          </>
        )}

        {/* ---------------------------------------------- logistics */}
        {has('poll') && (
          <Section heading="Find a time" note={b.canEditFrame ? 'The only thing on this board you set up yourself.' : `${(groundForSignals as any)?.leadFirstName ?? 'The person running this check-in'} can set up a poll to find a time.`}>
            <Panel>
              {b.canEditFrame && (
                <div className={`gwui-pt-8 gwui-pr-0 gwui-pb-8 gwui-pl-0 ${b.poll ? 'gwui-rule-bottom' : 'gwui-rule-bottom-none'}`}>
                  {!showPollForm ? (
                    <button onClick={() => { setShowPollForm(true); setPollQ(b.poll?.question ?? 'Weekly sync, best time'); setPollOpts((b.poll?.options ?? []).map((o) => o.label).join('\n')) }}
                      className="gwui-fs-13-5 gwui-ink-navy gwui-rule-none gwui-pt-0 gwui-pr-0 gwui-pb-0 gwui-pl-0" style={{background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, textDecoration: 'underline'}}>
                      {b.poll ? 'Change the times' : 'Set up an availability poll'}
                    </button>
                  ) : (
                    <form noValidate onSubmit={(e) => { e.preventDefault(); if (pollQ.trim() && pollOpts.trim() && !savePoll.isPending) savePoll.mutate() }} className="gwui-gap-8" style={{display: 'flex', flexDirection: 'column'}}>
                      <input value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="What are you finding a time for?"
                        className="gwui-pt-7 gwui-pr-10 gwui-pb-7 gwui-pl-10 gwui-fs-13-5 gwui-rule" style={{borderRadius: 7, fontFamily: 'inherit', outline: 'none'}} />
                      <textarea value={pollOpts} onChange={(e) => setPollOpts(e.target.value)} placeholder={'One time per line\nTue 16:00\nWed 09:00'}
                        className="gwui-pt-7 gwui-pr-10 gwui-pb-7 gwui-pl-10 gwui-fs-13-5 gwui-rule" style={{minHeight: 68, borderRadius: 7, fontFamily: 'inherit', outline: 'none', resize: 'vertical'}} />
                      {b.poll && (
                        <div className="gwui-fs-13 gwui-ink-amber">
                          Changing the times clears everyone's availability, because an answer to a question that changed is not an answer.
                        </div>
                      )}
                      <div className="gwui-gap-8" style={{display: 'flex'}}>
                        <UIButton kind="primary" size="small" type="submit" disabled={!pollQ.trim() || !pollOpts.trim() || savePoll.isPending}>
                          {savePoll.isPending ? 'Saving...' : 'Save'}
                        </UIButton>
                        <UIButton kind="secondary" size="small" onClick={() => { if (pollQ.trim() || pollOpts.trim()) setPollCancelArmed(true); else setShowPollForm(false) }}>Cancel</UIButton>
                      </div>
                      {pollCancelArmed && (
                        <Confirm saying="Discard the question and times you typed?" confirmLabel="Discard" keepLabel="Keep typing"
                          onConfirm={() => { setPollCancelArmed(false); setShowPollForm(false) }} onKeep={() => setPollCancelArmed(false)} />
                      )}
                    </form>
                  )}
                </div>
              )}
              {!b.poll ? (
                <div className="gwui-fs-15 gwui-ink-muted">No availability poll yet.</div>
              ) : (
                <>
                  <div className="gwui-fs-14 gwui-ink-dark gwui-pt-4 gwui-pr-0 gwui-pb-4 gwui-pl-0" style={{fontWeight: 700}}>
                    {b.poll.question}
                    <span className="gwui-fs-13 gwui-ink-navy gwui-ml-8" style={{fontWeight: 600}}>tap your name to mark availability</span>
                  </div>
                  {b.poll.options.map((o) => {
                    const max = Math.max(...b.poll!.options.map((x) => x.count))
                    const win = o.count === max && max > 0
                    return (
                      <div key={o.id} className={`gwui-gap-10 gwui-pt-8 gwui-pr-8 gwui-pb-8 gwui-pl-8 gwui-inner-row ${win ? 'gwui-win-row' : ''}`} style={{display: 'flex', alignItems: 'center'}}>
                        <div className="gwui-fs-16" style={{fontWeight: 600, minWidth: 110}}>{o.label}</div>
                        {/* Only YOUR OWN availability is clickable. Everyone else is a
                            read-only indicator: the toggle endpoint acts on the caller,
                            so a clickable chip bearing someone else's name would set
                            your availability while appearing to set theirs. */}
                        <div className="gwui-gap-5" style={{display: 'flex', flexWrap: 'wrap', flex: 1, alignItems: 'center'}}>
                          {(() => {
                            const iCanMakeThis = o.whoIds.some((w) => myIds.has(w))
                            return (
                              <button
                                onClick={() => togglePoll.mutate(o.id)}
                                disabled={togglePoll.isPending}
                                title="Toggle your own availability for this time"
                                className={`gwui-fs-13 gwui-pt-3 gwui-pr-10 gwui-pb-3 gwui-pl-10 ${iCanMakeThis ? 'gwui-poll-chip-on' : 'gwui-poll-chip-off'}`}
                                style={{fontWeight: 700, borderRadius: 13, cursor: togglePoll.isPending ? 'wait' : 'pointer', fontFamily: 'inherit'}}
                              >
                                {iCanMakeThis ? '✓ you can make this' : 'I can make this'}
                              </button>
                            )
                          })()}
                          {o.who.filter(Boolean).length > 0 && (
                            <span className="gwui-fs-13 gwui-ink-muted">
                              also: {o.who.filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                        <div className={`gwui-fs-13-5 ${win ? 'gwui-ink-green' : 'gwui-ink-sub'}`} style={{minWidth: 42, textAlign: 'right', fontWeight: win ? 700 : 400}}>{o.count} in</div>
                      </div>
                    )
                  })}
                </>
              )}
            </Panel>
          </Section>
        )}

        {/*
          THE ALIGNMENT FEED, ON THE BOARD RATHER THAN ON THE SESSIONS TAB.

          "The alignment feed should be in the reports and board, not here." It was on Sessions -
          the tab about who has answered and when - where it competed with the session grid and had
          nothing to do with it. What it actually is: convergences and divergences accumulating
          across the run, which is the board's subject exactly.

          REBUILT FOR THE ENGINE'S NEW PATTERN SHAPE (AServedPattern, patterns/who-reads-a-pattern.ts).
          `groundForSignals.signals` is the very same `servedPatterns(...)` call as `b.patterns` above
          - one call, on the same ground, for the same reader - so whenever "What keeps coming up" is
          drawn (`shown.patterns`), every item here is already on the page. Drawing it twice would say
          the same thing twice in different words, so this says once, truly, how many there are and
          points at where they already are. Only when that section is not shown at all (the family or
          the scenario hides it) does this draw the panels itself, with the shared `PatternPanel` so a
          pattern never reads differently in two places. Kept for whoever runs the check-in only, as
          before: nobody else's pattern is served here in the first place, but `viewerRunsThisCheckIn`
          is kept too so a participant's own single pattern never turns into a feed of one.
        */}
        {viewerRunsThisCheckIn && (() => {
          const sigs: ServedPattern[] = ((groundForSignals as any)?.signals ?? [])
          if (sigs.length === 0) return null
          if (shown.patterns) {
            return (
              <Section heading="Alignment feed">
                <Panel>
                  <div className="gwui-fs-15 gwui-ink-muted">
                    {sigs.length === 1
                      ? 'One pattern has come up so far. It is shown above, under What keeps coming up.'
                      : `${sigs.length} patterns have come up so far. They are shown above, under What keeps coming up.`}
                  </div>
                </Panel>
              </Section>
            )
          }
          const good = sigs.filter((s) => s.kind === 'good').length
          const attention = sigs.filter((s) => s.kind === 'attention').length
          const carrying = sigs.filter((s) => s.kind === 'carrying').length
          const parts = [
            good === 1 ? '1 good sign' : `${good} good signs`,
            attention === 1 ? '1 pattern to look at' : `${attention} patterns to look at`,
            ...(carrying ? [carrying === 1 ? '1 pattern of somebody carrying something' : `${carrying} patterns of somebody carrying something`] : []),
          ]
          return (
            <Section heading="Alignment feed" note={`${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ' and ' : ''}${parts[parts.length - 1]}.`}>
              <Panel pad={false}>
                {sigs.map((sig) => (
                  <div key={sig.id} className="gwui-panel-row">
                    <PatternPanel
                      pattern={sig}
                      invalidateKey={['ground', id]}
                      name={patternPersonName(sig.participantId, sig.yours)}
                    />
                  </div>
                ))}
              </Panel>
            </Section>
          )
        })()}

        {/*
          U.10 ITEM 7: "REPORTS", THE PROTOTYPE'S WHITE TABLE (board-as-lead.jpg/.txt).
          One row per session: a date, a one-line summary of who has checked in, a pill (amber "Not
          shared" or green "Shared"), and a button. `sessionRows` is the exact data the Report tab's
          "Every session" list is built from (see lib/session-rows.ts and
          TheReportIsAListOfSessions.tsx); this shows the most recent few and points at that same
          list for the rest, rather than re-querying or re-computing anything.

          The prototype's weekly-digest row ("This week", "Week 38" - a beige "Friday" pill for one
          not yet due) is not built here: there is no weekly rollup in this data, only per-session
          rows, so nothing is invented in its place. Requested in docs/requests-to-engine.md.

          PRIVACY: GATED ON `shown.checkInGrid`, NOT ON HAVING ANY ROWS. `sessionRows` comes from
          `groundForSignals` (`groundsApi.get`), fetched for every reader, and unlike every other
          section on this board it has no server-side `has(...)` gate of its own - so without a
          guard here, a participant would see the whole team's completion and share state, which
          board-as-participant.txt never shows them (their board has no Reports table at all, only
          the plain "Every session" link at the foot). `checkInGrid` is the server's own, already
          correct signal for "this reader may see everyone's session state" - the same fact this
          table needs - so it is reused here rather than inventing a second, client-only privacy
          rule that could drift from the server's.
        */}
        {shown.checkInGrid && sessionRows.length > 0 && (
          <Section heading="Reports" note="Every session has two: each person's own, and the team's once you share it.">
            {/*
              U.10 (c2): FROM THE SHARED PARTS - the prototype's own list shape (board-as-lead.jpg:
              a session's date and who has checked in on the left, Share/Open on the right), which
              is exactly what EdgeRow already draws for "anything that needs you" elsewhere on this
              board. `kind="decide"` for a session still waiting to be shared (a decision for
              whoever runs it), `kind="ready"` once it is (ready to read).
            */}
            <EdgeList label="Reports">
              {sessionRows.slice(0, 5).map((r) => (
                <EdgeRow
                  key={r.sessionNumber}
                  kind={r.closed ? 'ready' : 'decide'}
                  title={`Session ${r.sessionNumber}${r.opened ? `, ${sessionDay(r.opened)}` : ''}`}
                  detail={checkedIn(r.answered, r.total)}
                  actions={(
                    <>
                      <Tag tone={r.closed ? 'proven' : 'attention'}>{r.closed ? EVERY_SESSION.shared : EVERY_SESSION.notShared}</Tag>
                      <UIButton
                        kind={r.closed ? 'secondary' : 'primary'} size="small"
                        onClick={() => navigate(r.myCheckInId ? `/checkin/${r.myCheckInId}/report` : `/grounds/${id}/session/${r.sessionNumber}`)}
                      >
                        {r.closed ? 'Open' : 'Share it'}
                      </UIButton>
                    </>
                  )}
                />
              ))}
            </EdgeList>
            {/*
              PICTURE-CHECK ROUND 6, ITEM F: "N SESSION(S) IN ALL", AND A REAL OUTLINED BUTTON.
              "All 1 session" read oddly in the singular; the prototype's own phrasing puts the
              count first ("All 38 sessions"). Read as a sentence instead: "1 session in all." /
              "38 sessions in all." And `btnGhost` (thin grey border, grey text) drew as a pale bar
              rather than the prototype's wide outlined white button with a border and bold text.
            */}
            <div className="gwui-mt-10 gwui-fs-13-5 gwui-ink-sub">
              {sessionRows.length} session{sessionRows.length === 1 ? '' : 's'} in all.
            </div>
            <Link
              to={`/grounds/${id}?tab=report`}
              className="gwui-wide-outline-btn gwui-mt-8 gwui-pt-11 gwui-pr-16 gwui-pb-11 gwui-pl-16 gwui-fs-16"
            >
              {EVERY_SESSION.heading}
            </Link>
          </Section>
        )}

        {/*
          A PARTY STILL GETS "EVERY SESSION" (board-as-participant.txt ends with "Every session" and
          "Ask", with no Reports table above it - just the link). Their own session-by-session record
          lives on the "What I shared" tab (ground-tabs.ts key `record`); there is no page yet that is
          specifically "every session, as a party reads it" the way TheReportIsAListOfSessions is for
          whoever runs the check-in, so this points at the closest existing one rather than inventing
          a destination. Noted for whoever picks up a dedicated one.
        */}
        {!shown.checkInGrid && b.myParticipantId && (
          <Link
            to={`/grounds/${id}?tab=record`}
            className="gwui-wide-outline-btn gwui-mt-20 gwui-pt-11 gwui-pr-16 gwui-pb-11 gwui-pl-16 gwui-fs-16"
          >
            {EVERY_SESSION.heading}
          </Link>
        )}

        {/*
          THE WHOLE RUN, IN ONE PLACE. "I need the board to carry the entire history in one place."

          The board read only the CURRENT working copy of the report plus the record entries, so a
          six-session run showed its latest state and nothing about how it got there - while the
          per-round snapshots sat in `report_rounds`, immutable, one row per closed round, read by
          a component that lived on the report tab.

          Both come here: what the report said at the end of each round, and where the run finished
          if it has. This is now the only screen that carries the arc, which is why the report tab
          could become a list of sessions.

          U.10 ITEM 7: UNDER "OVER TIME", OPENING ON ASK. The prototype has this as its own section
          heading, not a small blue link-style label - picture-check round 6, item E: the same 21px
          bold heading every other section uses. U.10 (e): now the shared Section itself, using its
          own `action` slot for "Show"/"Hide" (a control, not the plain `note` sentence) instead of
          a hand-matched heading beside a plain button.
        */}
        <Section
          heading="Over time"
          action={(
            <button
              onClick={() => setShowOverTime((v) => !v)}
              className="gwui-rule-none gwui-pt-0 gwui-pr-0 gwui-pb-0 gwui-pl-0 gwui-fs-13-5 gwui-ink-navy" style={{background: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', flexShrink: 0}}
            >
              {showOverTime ? 'Hide' : 'Show'}
            </button>
          )}
        >
          {showOverTime ? <HowThisHasMoved groundId={id!} viewerRunsThisCheckIn={viewerRunsThisCheckIn} /> : undefined}
        </Section>
        {/*
          AND HOW IT ENDS, BUT ONLY NEAR THE END.

          The gate came across with the panel and it has to: unconditionally rendered, this is
          four buttons including "Stop the project" on the board of a check-in that started
          yesterday, which is the exact defect `the-exit-belongs-at-the-exit` was written for. I
          moved the panel here without it, which put that defect back.

          The board's own spine says which session the run is on and how many there are, so the
          condition is read from what the board already has rather than from a second request.
        */}

        {(() => {
          /*
            AT OR PAST THE LAST SESSION, counted from sessions everybody has finished.

            NOT `phaseSpine.currentSession`, which is the highest session NUMBER any check-in row
            carries - and rows for the next session are created the moment one completes, so it
            runs ahead of the run. Using it would offer the exit while somebody is four rounds
            behind, which is the optimism that once closed a check-in over a missing account.

            A spine session is 'done' only when every check-in for it completed, so counting those
            is the min-across-people rule. The other half of the gate - a decision already under
            way - is the panel's own, because only it knows whether anybody has picked.
          */
          return (
            <div className="gwui-mt-14">
              {/* U.11: for everyone except the lead while it is open. The lead decides on the
                  ending page, and once it has ended it shows at the top of the board. */}
              <ResolutionPanel groundId={id!} nearTheEnd={nearTheEnd} place="board-bottom" />
            </div>
          )
        })()}

        {/*
          HOW THIS IS PUT TOGETHER, WHICH USED TO SIT ON THE SHARED REPORT.

          A collapsed legend at the top of the report body explaining the method: what leads, what a
          gap names, what an honest close is. The report body it explained has gone; the board is the
          shared surface now and does the things the legend describes - it leads with what is open,
          each gap names both positions and what is at stake, and it closes on the question the
          check-in turns on.

          Collapsed, and at the foot rather than the head. On the report it was the first thing on
          the page, so everybody read an explanation of the method before reading anything the method
          produced. It is for the person who wants to know where a line came from, and that person
          goes looking after they have read it, not before.
        */}
        <details className="gw-legend gwui-mt-28">
          <summary className="gwui-fs-13-5 gwui-ink-sub" style={{cursor: 'pointer'}}>How this board is put together</summary>
          <div className="gwui-gap-12 gwui-mt-10" style={{display: 'grid'}}>
            {[
              { h: 'What is open, first', p: 'It leads with what is still unresolved and what everyone already agrees on. The read across everything people said follows it.' },
              { h: 'Each gap names both sides', p: "Every disagreement carries each person's position in their own words, and what is at stake if it holds. The most significant comes first." },
              { h: 'Honest closes', p: 'Decisions rarely finish clean, so it names what is aligned, what is open, and the question the whole thing turns on. It never gives a verdict on a person.' },
            ].map((cell, i) => (
              <div key={i}>
                <div className="gwui-fs-13-5 gwui-ink-muted gwui-mb-4" style={{letterSpacing: '.1px', fontWeight: 700}}>{cell.h}</div>
                <div className="gwui-fs-15 gwui-ink-sub" style={{lineHeight: 1.55}}>{cell.p}</div>
              </div>
            ))}
          </div>
        </details>

        {/*
          THE FOOTER IS GONE. It said "Everyone on this check-in sees the same board. It regenerates as
          people check in each session." Neither is true: each reader is served what they may read, and
          opening the board rebuilds nothing. The line at the top says what is true.
        */}

        {/*
          U.10 ITEM 8: THE ASK BAR AT THE FOOT (board-as-lead.txt: "Ask about this board, for
          example "Why is Green Mart not quarter?"" then "Ask"). Wired to Ask Groundwork (U.14):
          typing a question here and pressing Ask opens that panel already asking it, scoped to
          this check-in - `showWith` sets both the panel open and the question in one step, and
          `checkInOnThisPage` (AskGroundwork.tsx) already reads the check-in id straight off this
          page's own address, so "about" is this board without anything extra to wire.

          PICTURE-CHECK ROUND 6, ITEM G: THE EXAMPLE IS THIS BOARD'S OWN DATA, NOT THE PROTOTYPE'S
          SAMPLE ("Green Mart" is not in this check-in). Built from the first blocker when there is
          one ("Why is Baraka Mwangi still waiting on the discount decision?"), else the plain
          example asked for.
        */}
        <AskTheBoard firstBlocker={b.dependencies?.[0] ?? null} />
    </Page>
  )
}

/**
 * U.10 ITEM 8: A FULL-WIDTH BAR, THE PROTOTYPE'S OWN WORDS.
 * Kept as its own small component so BoardPage's already-long body does not grow another inline
 * form; it owns nothing but the draft text, which it hands to the shared Ask Groundwork panel.
 */
function AskTheBoard({ firstBlocker }: { firstBlocker: { from: string | null; what: string; on: string | null } | null }) {
  const [draft, setDraft] = useState('')
  const showWith = useAskStore((s) => s.showWith)
  const example = firstBlocker?.from
    ? `Why is ${firstBlocker.from} still waiting on ${firstBlocker.what}?`
    : 'Who is waiting on whom?'
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const m = draft.trim()
        if (!m) return
        showWith(m)
        setDraft('')
      }}
      className="gwui-gap-8 gwui-mt-22" style={{display: 'flex'}}
    >
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`Ask about this board, for example “${example}”`}
        aria-label="Ask about this board"
        className="gwui-pt-11 gwui-pr-14 gwui-pb-11 gwui-pl-14 gwui-rule gwui-fs-13-5 gwui-ink-text" style={{flex: 1, borderRadius: 8, background: 'white', fontFamily: 'inherit'}}
      />
      <UIButton kind="primary" type="submit">Ask</UIButton>
    </form>
  )
}

