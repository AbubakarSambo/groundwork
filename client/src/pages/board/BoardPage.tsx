import { hasEnded, howItEnded } from '@/lib/a-ground-that-has-ended'
import { useState } from 'react'
import { WhatSuccessLooksLikeFor } from '@/components/gw/WhatSuccessLooksLike'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { ThatIsOnTheRecord } from '@/components/gw/ThatIsOnTheRecord'
import { TheOtherBoardsYouAreIn } from '@/components/gw/TheOtherBoardsYouAreIn'
import { BOARD_MUTED_INK, BOARD_BODY_INK, BOARD_ACCENT_INK } from '@/components/gw/the-board-reads-on-a-dark-ground'
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
import { Zone, Sec, Card, Row, Pill, td, btn, miniBtn, btnGhost, Button, NeedsYouList, NeedsYouRow } from '@/components/gw/kit'
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






const dshort = (iso?: string | null) =>
  iso ? whenItWas(iso, 'dayAndMonth') : ' - '

/**
 * U.10 RE-REVIEW ITEM B: A SESSION PILL, AS A SENTENCE ITS OWN READER CAN FOLLOW.
 *
 * "Session 1, 27 Sept, now" - three comma-joined fragments with no verb - was still a list of
 * pieces rather than something read the way a person reads a sentence.
 */
function sessionPillSentence(s: { n: number; state: string; date: string | null; opensOn?: string | null }, groundEnded: boolean): string {
  const current = s.state === 'current' && !groundEnded
  if (current) return s.date ? `Session ${s.n} is today, ${dshort(s.date)}.` : `Session ${s.n} is today.`
  if (s.date) return `Session ${s.n} was on ${dshort(s.date)}.`
  if (s.opensOn && s.state !== 'done') return `Session ${s.n} opens on ${dshort(s.opensOn)}.`
  return `Session ${s.n}.`
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
  if (myName && who.includes(myName)) who = [myName, ...who.filter((w) => w !== myName)]
  const say = (w: string) => (myName && w === myName ? 'You' : w)
  return `${say(who[0])} and ${say(who[1])} see this differently.`
}

/** What each record type under "Who owns what" is, in a sentence rather than a bare tag. */
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
/*
 * THE THREE BADGES ON THE ALIGNMENT FEED.
 *
 * Good sign is green, a pattern to look at is amber, and carrying is neither: somebody holding
 * together what nobody else picked up has done nothing wrong and nothing to celebrate. Green would
 * congratulate them for absorbing a failure and amber would read as a mark against them, so it
 * gets the neutral blue the rest of the product uses for "here is a fact".
 *
 * A type this does not know falls to amber, which is where an unlabelled signal used to land
 * anyway - and a badge saying nothing is worse than one saying the cautious thing.
 */
function badgeColoursFor(type: string): { background: string; color: string } {
  if (type === 'Good sign') return { background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)' }
  if (type === 'Carrying') return { background: 'var(--gw-blue-bg)', color: 'var(--gw-blue-t)' }
  return { background: 'var(--gw-amber-bg)', color: 'var(--gw-amber-t)' }
}

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

/**
 * "Daily on weekdays, from 4pm. Session 38 of 65. Runs until 30 September." is the prototype's
 * header sentence. There is no field yet for the cadence's words ("Daily on weekdays, from 4pm."),
 * so that part is left out rather than guessed; the rest is built from what the board does send.
 *
 * `endsAt` is the check-in's own scheduled end, not a target's deadline - a team's number can carry
 * its own "by 20 December" while the check-in itself runs to a different date, and this sentence is
 * about the check-in.
 *
 * WAS: `${dshort(startsAt)} to ${dshort(endsAt)}`, which printed " - to 13 Dec ·" the moment
 * `startsAt` was null, because `dshort` stands a bare " - " in for a missing date rather than
 * dropping it. A full sentence cannot leave a blank where a word should be, so this builds only the
 * parts that have data.
 */
function phaseSpineSentence(
  phaseSpine: { startsAt: string | null; endsAt: string | null; currentSession: number } | null | undefined,
  planned: number | null,
): string | null {
  if (!phaseSpine) return null
  const parts: string[] = []
  if (phaseSpine.currentSession) {
    parts.push(planned ? `Session ${phaseSpine.currentSession} of ${planned}.` : `Session ${phaseSpine.currentSession}.`)
  }
  if (phaseSpine.endsAt) parts.push(`Runs until ${whenItWas(phaseSpine.endsAt, 'dayAndMonthLong')}.`)
  return parts.length ? parts.join(' ') : null
}

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
  const [searchParams] = useSearchParams()
  const justAnswered = searchParams.get('done') === '1'
  /* Whether to build the attendance grid as a grid at all. See the component it chooses. */
  const onAPhone = useIsAPhone()
  const viewerRunsThisCheckIn = !!user?.id && (groundForSignals as any)?.initiatorId === user.id

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
    return <div role="status" style={{ padding: 40, textAlign: 'center', color: 'var(--gw-muted)' }}>Loading the board…</div>
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
      <div style={{ maxWidth: 620, margin: '48px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>This board could not be loaded.</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 16 }}>{why.say}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {why.canRetry && <button onClick={() => refetch()} style={btn}>Try again</button>}
          <button onClick={() => navigate('/grounds')} style={why.canRetry ? { ...btn, background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-border)' } : btn}>Back to check-ins</button>
        </div>
      </div>
    )
  }

  // A private-mode or mood-sensing ground has NO board. Say so plainly and point
  // at the report, rather than showing an empty page that reads as broken.
  if (!data.renders) {
    return (
      <div style={{ maxWidth: 620, margin: '48px auto', padding: '0 20px' }}>
        <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '22px 24px' }}>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 8 }}>
            No shared board here
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--gw-text)', marginBottom: 16 }}>{data.reason}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/grounds/${id}/report`} style={{ ...btn, textDecoration: 'none' }}>Read the report</Link>
            <button onClick={() => navigate(`/grounds/${id}`)} style={btnGhost}>Back to the check-in</button>
          </div>
        </div>
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
      <div style={{ maxWidth: 620, margin: '48px auto', padding: '0 20px' }}>
        <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '22px 24px' }}>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 8 }}>
            Your answer first
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--gw-text)', marginBottom: 16 }}>{(data as any).saying}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate(`/grounds/${id}`)} style={btn}>Do my check-in</button>
            <button onClick={() => navigate('/grounds')} style={btnGhost}>Back to check-ins</button>
          </div>
        </div>
      </div>
    )
  }

  const b = data as BoardPresent
  /* Whether the check-in is over, so the board stops drawing a clock. See lib/a-ground-that-has-ended. */
  const groundEnded = hasEnded((b as any)?.groundStatus)
  const endedSaying = howItEnded({ status: (b as any)?.groundStatus, endState: (b as any)?.endState })
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

  return (
    <div style={{ background: '#EEF0F6', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '20px 20px 80px' }}>

        {/*
          A WAY BACK TO THE GROUND THIS BOARD BELONGS TO.
          
          There were back-links in the error state and the no-board state, and none
          on the board that actually renders - the only state anybody reaches. Her
          words: "i have no way to get back to anywhere from the board." The rail is
          there, so it was not a trap, but the board is a tab of a ground and there
          was no way back to the ground.
        */}
        <div style={{ marginBottom: 12 }}>
          {/*
            AND IT SENT A LEAD TO SOMEBODY ELSE'S VIEW.
            
            This went to `/grounds/:id/p` for everybody. `/grounds/:id` already decides by role -
            a lead gets the lead's page, a party gets theirs - so hard-coding the party path meant
            the lead's own way back off the board landed them on the party view of their own
            check-in, one tab bar away from where they started.
          */}
          <button
            onClick={() => navigate(`/grounds/${id}`)}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ← Back to the check-in
          </button>
        </div>

        {/* Somebody who has just answered from a link lands here with ?done=1: their answer landed, and where the report goes. */}
        {justAnswered && <ThatIsOnTheRecord groundId={id!} />}

        {/* header + phase spine */}
        <header style={{ background: 'var(--gw-dark)', color: 'white', borderRadius: 16, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div>
              {/*
                THE OTHER BOARDS, BESIDE THE NAME OF THIS ONE. A board was a page you arrived at
                from one check-in and left the same way - read one, back to the list, find the next,
                open it, open its board. See the component for why the server says which have one.
              */}
              {/*
                NOT WHEN THE BOARDS PAGE IS ALREADY SWITCHING. On /boards the tabs above do this
                job, and two switchers one above the other, both listing the same check-ins, is a
                reader asking which of them is the real one.
              */}
              {!groundId && <div style={{ marginBottom: 8 }}><TheOtherBoardsYouAreIn groundId={id!} /></div>}
              <h1 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '.2px' }}>{b.title}</h1>
              <div style={{ fontSize: 12, color: '#AEB6D6', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ background: '#2C2E52', border: '1px solid #3C3E66', color: '#C7CDF0', borderRadius: 20, padding: '2px 10px', fontSize: 10.5, fontWeight: 700 }}>
                  {/* Say what this is, in the words the person setting it up
                      would use. "Cohort ground" is our internal grouping name
                      leaking onto the page - nobody describes their own
                      situation that way. What actually distinguishes these is
                      whether the people see each other's work, which the lead
                      now sets directly, so that is what the badge says. */}
                  {b.peopleWorkTogether === false
                    ? 'Same work, separate places'
                    : b.family === 'DELIVERY' ? 'A team working together'
                    : b.family === 'COHORT' ? 'Same work, separate places'
                    : b.family === 'ONBOARDING' ? 'Settling into the role'
                    : 'A period being reviewed'}
                </span>
                {/*
                  A ground with no dates set rendered "— to — · session 1", which is
                  two em dashes standing in for information nobody entered, in the
                  header of the best page in the product - and em dashes are against
                  house style anyway. Say the session, and only mention dates when
                  there are dates.
                */}
                {/* Once it is over, what ended it is the header, not which session is open. */}
                {endedSaying ? (
                  <span style={{ color: BOARD_ACCENT_INK, fontWeight: 700 }}>{endedSaying}</span>
                ) : b.phaseSpine ? (
                  <span>{phaseSpineSentence(b.phaseSpine, plannedSessions)}</span>
                ) : null}
              </div>
            </div>
          </div>

          {/*
            HOW IT IS GOING, FIRST, WHICH IS WHY SOMEBODY OPENED THIS.

            "When I come in as a manager, I want progress/status and blockers/risks." The board
            opened on "where people differ": a manager had to read three zones to work out how far
            through it was, and the screen that knew was the check-in list they had just left.

            The same component the list and the boards page draw, on the dark ground. Not a second
            read of the same week - the server computes it once (how-a-check-in-is-going.ts) and all
            three are handed the answer.
          */}
          {(b as any).howItIsGoing && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #2E3054' }}>
              <HowItIsGoing
                summary={(b as any).howItIsGoing.latestSummary}
                glance={(b as any).howItIsGoing.glance}
                tone="dark"
              />
            </div>
          )}

          {has('phaseSpine') && b.phaseSpine && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #2E3054' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                  const skin = {
                    fontSize: 11, padding: '4px 10px', borderRadius: 20,
                    background: s.state === 'current' ? 'rgba(139,224,174,.18)' : '#2C2E52',
                    color: s.state === 'current' ? BOARD_ACCENT_INK : BOARD_MUTED_INK,
                    fontWeight: s.state === 'current' ? 700 : 500,
                  } as const
                  if (!been) return <div key={s.n} style={skin}>{face}</div>
                  return (
                    <button
                      key={s.n}
                      type="button"
                      onClick={() => navigate(`/grounds/${id}/session/${s.n}`)}
                      style={{ ...skin, border: '1px solid transparent', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
                    >
                      {face}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </header>

        {/*
          WHEN IT LAST CHANGED, AND THAT OPENING IT CHANGES NOTHING (U.10). The same line for every
          reader, from the server's `lastChangedAt`. Then, for an admin who only reads, who runs it.
        */}
        <p className="gw-t-small" style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.55, margin: '12px 0 0' }}>
          {whenTheBoardLastChanged(b.lastChangedAt)}
        </p>
        {b.readOnlyNote && (
          <p role="note" style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.55, margin: '8px 0 0' }}>{b.readOnlyNote}</p>
        )}

        {/*
          GROUNDWORK SUGGESTS … (C3, U.13, suggestion-daniel.txt), for whoever runs it: the
          suggestion with why, what would change it and the person's own answer, and "Your
          decision". The server serves it to the lead alone; nobody else is drawn anything here.
        */}
        {viewerRunsThisCheckIn && (
          <div style={{ marginTop: 14 }}>
            <SuggestionsForTheLead groundId={id!} where="board" />
          </div>
        )}

        {/*
          HOW IT ENDS, AT THE TOP (U.11, day-30-and-60.txt and ending-and-probation-review.txt).
          Once it has ended, everyone reads the outcome, who decided, when, and why. Near the end,
          the lead reads "It’s yours to decide how this ends." with the way to the ending page.
        */}
        <div style={{ marginTop: 14 }}>
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
          <section aria-labelledby="board-needs-you-h" style={{ marginTop: 16 }}>
            <h2 id="board-needs-you-h" className="gw-t-h2" style={{ margin: '0 0 8px' }}>What needs you in this check-in</h2>
            <NeedsYouList label="What needs you in this check-in">
              {needsHere.map((n: Need) => (
                <NeedsYouRow
                  key={n.key}
                  kind={n.kind}
                  title={n.title}
                  detail={n.detail ?? undefined}
                  actions={<Button kind="secondary" size="small" to={n.action.to}>{n.action.label}</Button>}
                />
              ))}
            </NeedsYouList>
          </section>
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
        <div style={{ background: '#20233E', color: 'white', borderRadius: 14, padding: '14px 18px', marginTop: 14 }}>
          <span style={{ fontSize: 13, letterSpacing: '.1px', color: BOARD_MUTED_INK, fontWeight: 700, display: 'block', marginBottom: 6 }}>
            How to read and use this board
          </span>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: BOARD_BODY_INK }}>
            Built from what each person shared in their private check-in.{' '}
            <b style={{ color: BOARD_ACCENT_INK, fontWeight: 600 }}>Use it to see what&rsquo;s going on and guide the conversation. It&rsquo;s not a verdict.</b>
          </p>
          {howToRead && (
            <>
              <p style={{ fontSize: 12, lineHeight: 1.55, color: BOARD_BODY_INK, marginTop: 7 }}>
                If something doesn&rsquo;t feel right, raise it in your next check-in. The board updates as people share more.
              </p>
              <p style={{ fontSize: 12, lineHeight: 1.55, color: BOARD_BODY_INK, marginTop: 7 }}>
                Each person is shown in the context of their own role, not scored against everyone else.
              </p>
              <p style={{ fontSize: 12, lineHeight: 1.55, color: BOARD_BODY_INK, marginTop: 7 }}>
                This is the shared picture from this round of check-ins. It can change as the picture changes.
              </p>
              <p style={{ fontSize: 12, lineHeight: 1.55, color: BOARD_BODY_INK, marginTop: 7 }}>
                Where people see things differently or progress has stalled, you can see what each person shared and support them.
              </p>
            </>
          )}
          <button
            onClick={() => setHowToRead(v => { localStorage.setItem(HOW_TO_READ_KEY, v ? 'closed' : 'open'); return !v })}
            style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, fontSize: 11.5, fontWeight: 700, color: BOARD_ACCENT_INK, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {howToRead ? 'Show less' : 'How to use it →'}
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
          <div role="status" style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 12, padding: '12px 14px', marginTop: 12, fontSize: 13, color: 'var(--gw-amber-t)', lineHeight: 1.6 }}>
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
        {shown.cascade && b.cascade && (
          <Card>
            <Row first>
              <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-muted)', marginBottom: 6 }}>
                {b.cascade.isCascade ? 'What this sits under' : 'Nothing above this'}
              </div>
              {b.cascade.parentNamed && (
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 6, lineHeight: 1.35 }}>
                  {b.cascade.parentNamed}
                </div>
              )}
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{b.cascade.why}</p>
              {b.cascade.teamsNamed.length > 1 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {b.cascade.teamsNamed.map((t: string) => (
                    <span key={t} style={{ fontSize: 11.5, padding: '3px 8px', borderRadius: 6, background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)' }}>{t}</span>
                  ))}
                </div>
              )}
            </Row>
          </Card>
        )}

        {/*
          THE PLAN'S OWN TOP LINE, WHICH THIS ZONE WAS MISSING.

          "Against the plan" opened on named targets and where accounts differ - both real, both
          downstream of a thing the board never showed: what success was said to be in the first
          place, and what each person independently says it is. The board is the shared picture, so
          the definition everybody is being read against belongs at the top of this zone rather than
          only on the Setup tab where one person typed it.
        */}
        {(shown.objectives || shown.divergence) && (
          <Card>
            <Row first>
              <WhatSuccessLooksLikeFor groundId={id!} />
            </Row>
          </Card>
        )}

        {shown.objectives && b.objectives && (
          <>
            <Sec title="What we are aiming for" src="the lead sets these" />
            {/* The privacy setting is on and some numbers still have nobody's name on them, so
                everybody can read those. Said to the only person who can fix it. */}
            {/* One total, ten people, from the export they already have. Above the form, because
                somebody with a team and a committed number reaches for this before typing. */}
            {b.canEditFrame && <SplitOneTotalAcrossPeople groundId={id!} />}
            {b.targetsNobodyOwns && (
              <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, fontSize: 12.5, color: 'var(--gw-amber-t)', lineHeight: 1.5 }}>
                {b.targetsNobodyOwns}
              </div>
            )}
            {b.objectivesPrompt && (
              <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, fontSize: 12.5, color: 'var(--gw-amber-t)', lineHeight: 1.5 }}>
                {b.objectivesPrompt}
              </div>
            )}
            <Card>
              {b.objectives.map((o, i) => {
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
                  <Row key={o.id} first={i === 0}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 160 }}>
                        {o.name}
                        {o.isNew && <span style={{ marginLeft: 7 }}><Pill tone="info">new</Pill></span>}
                        {/*
                          WHOSE NUMBER IT IS, on its own line. "12 shops· Rukia Otieno" read live: the
                          name sat right after the target with only a CSS margin between them, no
                          space in the text itself. Said as a plain sentence below the name instead.
                        */}
                        {o.owner && (
                          <div style={{ fontWeight: 400, color: 'var(--gw-sub)', fontSize: 12, marginTop: 2 }}>{o.owner}’s own target</div>
                        )}
                        {/*
                          A NUMBER NOBODY HAS DEFINED IS NOT AN AGREED NUMBER, AND THE ROW SAYS SO.
                          "signed 12m" read as settled while the lead's own note, one page away, said
                          nobody had decided whether the 12m is signed or recognised revenue. The
                          sentence is the lead's own; it does not change or block the target.
                        */}
                        {o.notSettled && <span style={{ marginLeft: 7 }}><Pill tone="warn">definition not settled</Pill></span>}
                      </div>
                      {/*
                        NOTHING TO MEASURE MEANS NOTHING TO DRAW. An aim with no number got an empty
                        bar, a "0" and "no change" beside it - read live as "Confirm her in the role ·
                        0 · no change", which says the decision did not happen. Without a target the
                        row is the aim and nothing else.
                      */}
                      {o.target != null ? (
                        <>
                          <div style={{ width: 140, height: 7, borderRadius: 6, background: '#D6DBEA', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gw-navy)', borderRadius: 6 }} />
                          </div>
                          {/* Three numbers a person can check, rather than a share of a target that
                              means the opposite thing on a ceiling. */}
                          <div style={{ fontSize: 12, color: 'var(--gw-sub)', minWidth: 96, textAlign: 'right' }}>
                            {o.journey?.start != null
                              ? (<><b style={{ color: 'var(--gw-dark)' }}>{o.count}</b>{`, up from ${o.journey.start}, aiming for ${o.target}`}</>)
                              : (<><b style={{ color: 'var(--gw-dark)' }}>{o.count}</b>{` of ${o.target}`}</>)}
                          </div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, minWidth: 92, textAlign: 'right', color: o.delta > 0 ? 'var(--gw-green-t)' : 'var(--gw-muted)' }}>
                            {o.delta > 0 ? `up ${o.delta} this session` : 'no change'}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', minWidth: 92, textAlign: 'right' }}>no number set</div>
                      )}
                    </div>
                    {o.notSettled && (
                      <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', marginTop: 5, lineHeight: 1.55, maxWidth: '68ch' }}>{o.notSettled}</div>
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
                        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            onClick={() => bumpObjective.mutate({ objectiveId: o.id, count: Math.max(0, o.count - 1) })}
                            disabled={(bumpObjective.isPending && bumpObjective.variables?.objectiveId === o.id) || o.count === 0}
                            title="Move this count down"
                            aria-label={`One fewer: ${o.name}`}
                            style={{ ...miniBtn, width: 'auto', padding: '0 8px' }}
                          >Lower</button>
                          <button
                            onClick={() => bumpObjective.mutate({ objectiveId: o.id, count: o.count + 1 })}
                            disabled={bumpObjective.isPending && bumpObjective.variables?.objectiveId === o.id}
                            title="Move this count up"
                            aria-label={`One more: ${o.name}`}
                            style={{ ...miniBtn, width: 'auto', padding: '0 8px' }}
                          >Raise</button>
                          <button
                            onClick={() => sureAboutTarget.arm(o.id)}
                            disabled={removeObjective.isPending}
                            title="Remove this target"
                            aria-label={`Remove target: ${o.name}`}
                            style={{ ...miniBtn, width: 'auto', padding: '0 8px', color: 'var(--gw-clay)' }}
                          >Remove</button>
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
                      <div style={{ fontSize: 11.5, color: 'var(--gw-navy)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>
                          The record shows <b>{o.suggestedCount}</b> for this, not {o.count}.
                        </span>
                        {/* THE LINE IT CAME FROM, because a number from nowhere is one a lead has no
                            way to judge. Asking somebody to accept a figure without showing them
                            what it was read from is asking them to trust rather than to check. */}
                        {o.suggestedSaid && (
                          <span style={{ display: 'block', width: '100%', color: 'var(--gw-sub)', fontStyle: 'italic' }}>
                            &ldquo;{o.suggestedSaid}&rdquo;
                          </span>
                        )}
                        <button
                          onClick={() => bumpObjective.mutate({ objectiveId: o.id, count: o.suggestedCount! })}
                          disabled={bumpObjective.isPending && bumpObjective.variables?.objectiveId === o.id}
                          style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 11, border: '1px solid var(--gw-blue-b)', background: 'var(--gw-blue-bg)', color: 'var(--gw-blue-t)', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Use {o.suggestedCount}
                        </button>
                      </div>
                    )}
                    {/* A new target means nothing until people have checked in against it. */}
                    {o.isNew && o.askedOf && (
                      <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 6 }}>
                        {(() => {
                          const asked = o.askedOf.filter((a) => a.asked).map((a) => a.name)
                          const notYet = o.askedOf.filter((a) => !a.asked).map((a) => a.name)
                          const askedSaid = asked.length ? `So far this has been asked of ${asked.join(', ')}.` : 'Nobody has been asked about this yet.'
                          return notYet.length ? `${askedSaid} It still needs to be asked of ${notYet.join(', ')}.` : askedSaid
                        })()}
                      </div>
                    )}
                  </Row>
                )
              })}
              {/* The lead sets the frame. A target, never an assessment of a person. */}
              {b.canEditFrame && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '11px 0', borderTop: '1px solid var(--gw-border)', flexWrap: 'wrap' }}>
                  <input
                    value={newObjName}
                    onChange={(e) => setNewObjName(e.target.value)}
                    placeholder="Add a target, e.g. Paying companies"
                    style={{ flex: 1, minWidth: 200, padding: '7px 10px', fontSize: 12.5, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none' }}
                  />
                  <input
                    value={newObjTarget}
                    onChange={(e) => setNewObjTarget(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="how many"
                    style={{ width: 96, padding: '7px 10px', fontSize: 12.5, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none' }}
                  />
                  <button
                    onClick={() => addObjective.mutate()}
                    disabled={!newObjName.trim() || addObjective.isPending}
                    style={{ ...btn, padding: '7px 14px', fontSize: 12.5, opacity: !newObjName.trim() || addObjective.isPending ? 0.5 : 1 }}
                  >
                    {addObjective.isPending ? 'Adding...' : 'Add target'}
                  </button>
                </div>
              )}
            </Card>
          </>
        )}

        {/* What was agreed at the start, so the rest of the board has something
            to be read against. This section has been in the DELIVERY family's
            list since the board was built with nothing behind it - so a lead saw
            where the work had got to and not what it was meant to be for. It is
            the only block here that no check-in can revise. */}
        {shown.startingState && b.startingState && (
          <>
            <Sec title="What was agreed at the start" src="set when this was opened, before any check-in" />
            <Card>
              <Row first>
                <div style={{ fontSize: 13.5, color: 'var(--gw-dark)', lineHeight: 1.55 }}>{b.startingState}</div>
              </Row>
            </Card>
          </>
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
          <>
            <Sec title="Where people differ" src="from what each person said" />
            <Card>
              {b.divergence.items.length === 0 && b.divergence.agreements.length === 0 ? (
                /* WHY IT IS EMPTY, NOT ONE SENTENCE FOR EVERY REASON. This said "This fills in once
                   more than one person has checked in" on a round where everybody had, three inches
                   under a tile that said so. The server computes it from the one counter. */
                <Row first><div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>{onlyOnePersonHere ? 'There is nothing to compare yet.' : (b.divergence.whyNothingYet ?? 'There is nothing to compare yet. This fills in once more than one person has answered.')}</div></Row>
              ) : (
                <>
                  {b.divergence.items.map((d: any, i: number) => (
                    <Row key={i} first={i === 0}>
                      {/*
                        A TAG GLUED TO THE SENTENCE BEFORE IT. "...12 shops.agreed" read on a live
                        board: the pill sat right after the topic with only a CSS margin between
                        them, which is invisible to a screen reader and to anybody copying the text.
                        The kind is said as its own sentence now, on its own line.
                      */}
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)' }}>
                        {d.topic ?? d.tag ?? 'Somewhere you see it differently'}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--gw-amber-t)', marginTop: 2 }}>{whoSeesThisDifferently(d.positions, myName)}</div>
                      {d.text && <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 3 }}>{d.text}</div>}
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
                        <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
                          {d.positions.map((pos: any, j: number) => (
                            <div key={j} style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--gw-text)' }}>
                              <div style={{ fontWeight: 700 }}>{pos.who ?? 'A colleague'}</div>
                              {pos.view && <div style={{ color: 'var(--gw-sub)' }}>{pos.view}</div>}
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
                        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 5, lineHeight: 1.55 }}>
                          <span style={{ fontSize: 10.5, letterSpacing: '.1px', fontWeight: 700, color: 'var(--gw-sub-d)', display: 'block', marginBottom: 2 }}>Why it matters</span>
                          {d.atStake}
                        </div>
                      )}
                    </Row>
                  ))}
                  {b.divergence.agreements.map((a: any, i: number) => (
                    <Row key={`a${i}`}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)' }}>
                        {typeof a === 'string' ? a : a.topic ?? 'Agreed'}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--gw-green-t)', marginTop: 2 }}>Everybody agrees on this.</div>
                    </Row>
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
            </Card>
          </>
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
          <Card>
            <Row first>
              <WhatToSettleTogether question={b.divergence.centralQuestion} />
            </Row>
          </Card>
        )}

        {shown.whatTheRoomIsAbout && (
          <>
            <Sec title="What people are after, and where" src="from what everybody said" />
            {b.whatTheRoomIsAboutNote && (
              <Card><div style={{ fontSize: 12.5, color: 'var(--gw-sub)' }}>{b.whatTheRoomIsAboutNote}</div></Card>
            )}
            {b.whatTheRoomIsAbout && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
                {/*
                  THE AIMS COME FIRST AND TAKE THE WIDTH THEY NEED. On a board where nobody set a
                  target, what each person is trying to do is the only thing there is to align on,
                  and it was showing nowhere. The count beside each aim is how many people hold it,
                  which is the whole point: an aim one person holds and an aim twenty hold are not
                  the same fact about a room.
                */}
                {/* The aims run the full width; Card takes no style, so the span lives on a wrapper. */}
                <div style={{ gridColumn: '1 / -1' }}>
                <Card pad={false}>
                  <div style={{ padding: '13px 15px 10px', borderBottom: '1px solid var(--gw-border)', fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)' }}>
                    What people are trying to do
                  </div>
                  <div style={{ padding: '2px 15px 12px' }}>
                    {b.whatTheRoomIsAbout.aims.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--gw-muted)', padding: '10px 0' }}>Nobody has said what they are after yet.</div>
                    ) : b.whatTheRoomIsAbout.aims.map((a, i) => (
                      <div key={a.aim} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)', flex: 1 }}>{a.aim}</div>
                          <Pill>{a.held.length === 1 ? '1 person' : `${a.held.length} people`}</Pill>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 3, lineHeight: 1.5 }}>{a.held.join(', ')}</div>
                      </div>
                    ))}
                  </div>
                </Card>
                </div>
                {([['Places named', b.whatTheRoomIsAbout.places], ['What it is about', b.whatTheRoomIsAbout.things]] as const).map(([label, rows]) => (
                  <Card key={label} pad={false}>
                    <div style={{ padding: '13px 15px 10px', borderBottom: '1px solid var(--gw-border)', fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)' }}>{label}</div>
                    <div style={{ padding: '2px 15px 12px' }}>
                      {rows.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--gw-muted)', padding: '10px 0' }}>Nobody named one.</div>
                      ) : rows.map((r, i) => (
                        <div key={r.name} style={{ padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)', flex: 1 }}>{r.name}</div>
                            <Pill>{r.named.length}</Pill>
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 3, lineHeight: 1.5 }}>{r.named.join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {shown.quickRead && b.quickRead && (
          <>
            <Sec title="The quick read" src="alignment and trust from the report" />
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
            <div className={onAPhone ? 'gw-qr-list' : undefined} style={onAPhone
              ? { background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '2px 14px' }
              : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
              {b.quickRead.map((q, i) => {
                const tone = q.tone === 'bad' ? 'var(--gw-red-t)' : q.tone === 'warn' ? 'var(--gw-amber-t)' : q.tone === 'good' ? 'var(--gw-green-t)' : 'var(--gw-dark)'
                return onAPhone ? (
                  <div key={q.label} style={{ padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--gw-sub-d)', fontWeight: 700 }}>{q.label}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: tone, textAlign: 'right' }}>{q.value}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginTop: 3, lineHeight: 1.5 }}>{q.sub}</div>
                  </div>
                ) : (
                  <div key={q.label} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--gw-muted)', fontWeight: 700 }}>{q.label}</div>
                    <div style={{ fontFamily: 'var(--gw-font-name)', fontSize: 24, marginTop: 5, lineHeight: 1, color: tone }}>{q.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>{q.sub}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}


        {/* ---------------------------------------------- at a glance */}
        {/* quickRead and startingState moved into the switchboard-ordered group above (item 2). */}
        {(shown.decisions || shown.eachPerson) && <Zone label="At a glance" />}

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
          <>
            <Sec title="What the record shows" src="across every session so far" />
            <WhatTheRecordShows it={(b as any).overTime} />
          </>
        )}

        {((b as any).whatTheAnswersSay || (b as any).theJudgement) && (
          <>
            {/*
              THE JUDGEMENT FIRST, THEN WHAT PEOPLE SAID.

              "The report did not put things into buckets, do clear synthesis." The network read
              below this is what everybody said, grouped. This is what it means, what to do about it,
              and what it cannot tell you - which is the thing a reader opens a board for. A summary
              above the detail, the way every other read on this page is arranged.
            */}
            <Sec title="What the answers say" src="from everybody who has answered so far" />
            <TheJudgement it={(b as any).theJudgement} />
            {(b as any).whatTheAnswersSay && <WhatTheNetworkSaid picture={(b as any).whatTheAnswersSay} />}
          </>
        )}

        {shown.eachPerson && (
          <>
            <Sec title="Where each person is" src="ordered by what needs you, not by name" />
            <WhereEachPersonIs rows={b.eachPerson!} />
          </>
        )}

        {/*
          WHAT THE CHECK-INS ASKED FOR AND DID NOT GET.

          The conversation asks twice and then lets it go, rather than pressing somebody who has
          already declined twice. Somebody has to see the gap, and it is you. It is not a mark
          against anybody: half the time the honest reason is that nobody could have answered -
          a target nobody set, a dependency nobody owns.
        */}
        {!!b.stillUnanswered?.length && (
          <>
            <Sec title="Asked for, not answered" src="the check-in stopped asking" />
            <Card>
              {b.stillUnanswered.map((g, i) => (
                <Row key={`${g.who}-${g.what}`} first={i === 0}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, color: 'var(--gw-dark)' }}>
                      <b style={{ fontWeight: 700 }}>{g.who}</b> &mdash; {g.what}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--gw-sub)', whiteSpace: 'nowrap' }}>
                      {/* Some of these cannot be confirmed either way - the check-in asked and
                          nothing on the record can prove the answer. Saying "they did not answer"
                          about somebody who answered in their first sentence would be worse than
                          saying nothing. */}
                      {g.certain ? `open since session ${g.sinceRound}` : `asked in session ${g.sinceRound}, could not confirm`}
                    </span>
                  </div>
                </Row>
              ))}
            </Card>
          </>
        )}



        {shown.decisions && b.decisions && (
          <>
            <Sec title="Decisions needed" src="raised by what differs or is stuck" />
            <Card>
              {b.decisions.map((d, i) => (
                <Row key={i} first={i === 0}>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'var(--gw-font-name)', fontSize: 17, color: 'var(--gw-navy)', minWidth: 18 }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--gw-dark)', fontSize: 13 }}>{d.question}</div>
                      <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2 }}>{d.why}</div>
                    </div>
                    <Pill tone={d.source === 'blocker' ? 'bad' : 'warn'}>{d.owner}</Pill>
                  </div>
                </Row>
              ))}
            </Card>
          </>
        )}

        {/* ---------------------------------------------- against the plan */}





        {/* ---------------------------------------------- the work */}
        {(shown.whoOwnsWhat || shown.dependencies || shown.checkInGrid) && <Zone label="The work" />}


        {shown.whoOwnsWhat && b.whoOwnsWhat && (
          <>
            {/* AN UPDATE HAS NO OWNERSHIP TO READ. Its per-person cards are the answers to the lead's one line. */}
            {b.family === 'UPDATE'
              ? <Sec title="What each person said" src="their answers to the question, in their words" />
              : <Sec title="Who owns what" src="read from what people said in their check-ins" />}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
              {b.whoOwnsWhat.map((p) => (
                <Card key={p.participantId} pad={false}>
                  <div style={{ padding: '13px 15px 10px', borderBottom: '1px solid var(--gw-border)' }}>
                    {/*
                      The server falls back from a missing name to the ROLE rather than the email
                      address (W-UX-4), so the subtitle has to stop repeating it - otherwise a person
                      with no account yet reads "Engineer" over "Engineer".
                    */}
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)' }}>{nameOnTheBoard(b, p.participantId, p.name)}</div>
                    {p.role && p.role !== p.name && <div data-leads-note style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 1 }}>{theLeadsNote(p.role)}</div>}
                  </div>
                  <div style={{ padding: '2px 15px 10px' }}>
                    {p.items.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--gw-muted)', padding: '10px 0' }}>{b.family === 'UPDATE' ? 'Has not answered yet.' : 'Nobody has said anything about this yet.'}</div>
                    ) : p.items.map((it, i) => (
                      <div key={it.id} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)' }}>
                        <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>{it.text.replace(/^\[VERIFIABILITY:[A-Z]+\]\s*/, '')}</div>
                        <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                          {/*
                            RECORD TYPES ARE THE GOAL VOCABULARY, SAID AS A SENTENCE. "success
                            definition", "commitment", "intent" and "progress" as bare tags are the
                            record's own internal words, printed at somebody rather than explained
                            to them. The lookup is the record type; the reader gets a sentence.
                          */}
                          {b.family !== 'UPDATE' && WHAT_THIS_ITEM_IS[it.type] && (
                            <span style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{WHAT_THIS_ITEM_IS[it.type]}</span>
                          )}
                          {it.sessionNumber && <span style={{ fontSize: 10.5, color: 'var(--gw-muted)' }}>from session {it.sessionNumber}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {shown.dependencies && b.dependencies && (
          <>
            <Sec title="Waiting on" src="handoffs between people" />
            {/*
              Nothing to offer in the empty state, so it says where this comes from
              instead. A handoff is extracted from what people say in their check-ins -
              there is no button that would produce one, and an empty state implying
              otherwise would send somebody looking for it. W8-24.
            */}
            <Card>
              {b.dependencies.length === 0 ? (
                <Row first><div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>Nothing here yet. Handoffs appear when somebody says in a check-in that they are waiting on another person.</div></Row>
              ) : b.dependencies.filter((d) => (d.what ?? '').trim().toLowerCase() !== (d.on ?? '').trim().toLowerCase()).map((d, i) => (
                <Row key={d.id} first={i === 0}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 13 }}>{d.from}</span>
                    <span style={{ color: 'var(--gw-sub)', fontSize: 12 }}>needs</span>
                    <Pill tone={d.status === 'CLEARED' ? 'good' : 'warn'}>{d.what}</Pill>
                    <span style={{ color: 'var(--gw-sub)', fontSize: 12 }}>from</span>
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 13 }}>{d.on ?? 'someone outside this check-in'}</span>
                    <span style={{ marginLeft: 'auto' }}>
                      <Pill tone={d.status === 'BLOCKING' ? 'bad' : d.status === 'CLEARED' ? 'good' : 'warn'}>
                        {d.status === 'BLOCKING' ? 'Blocking' : d.status === 'CLEARED' ? 'Cleared' : 'Waiting'}
                      </Pill>
                    </span>
                  </div>
                  {d.then && <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>{d.then}</div>}
                </Row>
              ))}
            </Card>
          </>
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
          return (
          <>
            <Sec title="Sessions this phase" src="from each session so far" />
            <Card>
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
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 460 }}>
                  <thead>
                    <tr>
                      {/*
                        A COLUMN OF DASHES IS NOT A COLUMN. W-UX-P.
                        
                        Since the role stopped being repeated where it is already the person's label
                        (W-UX-4), a board whose parties all show BY role renders "Role" as four
                        dashes - a header, a divider and no information. Seen on the running board.
                        
                        Dropped when no row has anything to put in it, kept the moment one does.
                      */}
                      {['Person', ...(anyRoleToShow ? ['Role'] : []), ...b.checkInGrid.sessions.map((s) => `Session ${s}`)].map((h) => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--gw-muted)', fontWeight: 700, borderBottom: '1px solid var(--gw-border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.checkInGrid.rows.map((r) => (
                      <tr key={r.participantId}>
                        {/*
                          Same reconciliation as the cards above (W-UX-4): when somebody has no
                          account yet, the label falls back to their role, so printing the role again
                          in the next column gave "Engineer | Engineer" on one row while the row above
                          it read "Sahar Okonkwo | -".
                        */}
                        <td style={td}><span style={{ fontWeight: 700, color: 'var(--gw-dark)' }}>{nameOnTheBoard(b, r.participantId, r.name)}</span></td>
                        {anyRoleToShow && (
                          <td style={{ ...td, color: 'var(--gw-sub)' }}>
                            {r.role && r.role !== r.name ? <span data-leads-note>{theLeadsNote(r.role)}</span> : r.managingOnly ? 'Managing only' : ' - '}
                          </td>
                        )}
                        {b.checkInGrid!.sessions.map((s) => {
                          const v = r.cells[String(s)] ?? 'na'
                          return (
                            <td key={s} style={td}>
                              {v === 'na' ? (
                                sessionState.get(s) === 'upcoming'
                                  ? <span aria-label="Not open yet" />
                                  : <span aria-label="Not on this session" style={{ color: 'var(--gw-muted)' }}> - </span>
                              ) : (
                                <Pill tone={v === 'done' ? 'good' : v === 'in-progress' ? 'info' : v === 'declined' ? 'bad' : 'flat'}>
                                  {v === 'done' ? 'Checked in' : v === 'in-progress' ? 'In progress' : v === 'declined' ? 'Declined' : 'Not started'}
                                </Pill>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </Card>
          </>
          )
        })()}

        {/* ---------------------------------------------- contribution and fairness */}
        {(shown.contribution || shown.coverage) && <Zone label="Contribution and fairness" />}

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
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '11px 13px', marginBottom: 10, maxWidth: 620 }}>
            {(b as any).whyYouOnlySeeYourself}
          </div>
        )}

        {shown.contribution && b.contribution && (
          <>
            <Sec title="Contribution against role" src="measured against each person’s own role" />
            <Card>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', padding: '6px 0 2px' }}>
                Is the role clear, and what does the record actually hold for each person, read in their own function's terms.
              </div>
              {/*
                THE SAME PARAGRAPH THREE TIMES IS A MAIL MERGE. When nobody's role is defined the note
                is one fact about the check-in, said once; and a party with no name and nothing on
                record gets no card, because a card for nobody says nothing.
              */}
              {b.contribution.every((c) => !c.remitDefined) && b.contribution.length > 1 ? (
                <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '12px 14px', marginTop: 9, background: 'var(--gw-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 14 }}>Everyone here</span>
                    <span style={{ fontSize: 12, color: 'var(--gw-amber-t)', fontWeight: 600 }}>no role clearly defined yet</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 9, padding: '8px 10px', marginTop: 8, lineHeight: 1.5 }}>
                    {b.contribution[0].note}
                  </div>
                </div>
              ) : b.contribution.filter((c) => c.name || c.remitDefined).map((c) => (
                <div key={c.participantId} style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '12px 14px', marginTop: 9, background: 'var(--gw-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 14 }}>{nameOnTheBoard(b, c.participantId, c.name)}</span>
                    {/* "Your note" to the lead who wrote it, never to an admin (U.7 review). */}
                    {c.remitDefined
                      ? (b.canEditFrame && c.remit ? <span data-leads-note style={{ fontSize: 12, color: 'var(--gw-sub)' }}>{theLeadsNote(c.remit)}</span> : null)
                      : <span style={{ fontSize: 12, color: 'var(--gw-amber-t)', fontWeight: 600 }}>role not clearly defined</span>}

                  </div>

                  {/* An undefined remit shows NO position. You cannot measure someone
                      against a bar that was never set. */}
                  {c.shown === false && c.remitDefined ? (
                    /* Too little on record to say anything about a person yet. A
                       hedge still reads as a verdict, so nothing is shown at all. */
                    <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 8, lineHeight: 1.45, fontStyle: 'italic' }}>
                      Not enough on record yet to say anything about this person's contribution. {c.basis}
                    </div>
                  ) : !c.remitDefined ? (
                    <div style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 9, padding: '8px 10px', marginTop: 8, lineHeight: 1.45 }}>
                      {c.note}
                    </div>
                  ) : (
                    <>
                      {/* A position is never shown without its reason. */}
                      <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.45 }}>
                        {c.reason}
                      </div>
                      {c.basis && (
                        <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--gw-muted)', lineHeight: 1.45 }}>
                          {c.basis}
                        </div>
                      )}
                      {c.fnLabel && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Pill tone="info">read as {c.fnLabel.toLowerCase()}</Pill>
                          {!c.fnConfident && <span style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontStyle: 'italic' }}>still provisional</span>}
                          {c.isBlocked && <Pill tone="warn">part of this is blocked</Pill>}
                        </div>
                      )}
                      <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.4, background: c.ownVoice ? 'var(--gw-blue-bg)' : 'transparent', border: c.ownVoice ? '1px solid var(--gw-blue-b)' : '1px dashed var(--gw-border)', borderRadius: 9, padding: '6px 10px', color: c.ownVoice ? 'var(--gw-blue-t)' : 'var(--gw-muted)', fontStyle: c.ownVoice ? 'normal' : 'italic' }}>
                        {c.ownVoice ?? 'No note. This person can add their own context through their next check-in.'}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {b.contribution[0]?.guard && (
                <div style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontStyle: 'italic', marginTop: 11, paddingTop: 9, borderTop: '1px dashed var(--gw-border)', lineHeight: 1.5 }}>
                  {b.contribution[0].guard}
                </div>
              )}
            </Card>
          </>
        )}

        {shown.coverage && b.coverage && (
          <>
            <Sec title="Where work is landing" src="whose work is landing where" />
            <Card>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', padding: '6px 0 2px' }}>
                A drop in ownership shows up as your responsibilities landing more and more in what other people describe as theirs.
                Rising is the early warning, often before targets are missed, because the work still gets done, by someone else.
              </div>

              {/* Both variants ship so the "does a bar read as a verdict" question
                  gets answered by real use rather than a guess. */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '8px 0 4px' }}>
                <span style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>Showing</span>
                {(['text', 'bar'] as CoverageVariant[]).map((v) => (
                  <button key={v} onClick={() => setVariant(v)} style={{
                    fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                    border: '1px solid ' + (b.coverageVariant === v ? 'var(--gw-dark)' : 'var(--gw-border)'),
                    background: b.coverageVariant === v ? 'var(--gw-dark)' : 'white',
                    color: b.coverageVariant === v ? 'white' : 'var(--gw-sub)',
                  }}>{v === 'text' ? 'words only' : 'with a bar'}</button>
                ))}
              </div>

              {b.coverage.reads.filter((r) => r.shown !== false).map((r) => (
                <div key={r.participantId} style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '12px 14px', marginTop: 9, background: 'var(--gw-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 14 }}>{nameOnTheBoard(b, r.participantId, r.name)}</span>
                    {/* "ROLE LEVEL" read as a heading over a single word; it is a small note beside
                        the name, not a section of its own, so it no longer renders in capitals. */}
                    <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>at {r.scope} level</span>
                    <span style={{ marginLeft: 'auto' }}>
                      <Pill tone={r.kind === 'LEAKING' ? 'warn' : r.kind === 'ABSORBING' ? 'info' : 'flat'}>
                        {r.kind === 'LEAKING' ? 'Landing with others' : r.kind === 'ABSORBING' ? "Taking on others' work" : 'Staying with them'}
                      </Pill>
                    </span>
                  </div>

                  {b.coverageVariant === 'bar' && r.remitDefined && (
                    <div style={{ height: 7, borderRadius: 6, background: '#D6DBEA', overflow: 'hidden', marginTop: 9 }}>
                      <div style={{ height: '100%', width: `${r.pct}%`, borderRadius: 6, background: r.kind === 'LEAKING' ? 'var(--gw-amber-b)' : r.kind === 'ABSORBING' ? 'var(--gw-navy)' : 'var(--gw-muted)' }} />
                    </div>
                  )}

                  {/* "WHAT PEOPLE SAID The role..." read live as one run-on line, the same bug as
                      "Why it matters" above. Its own line now. */}
                  <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45 }}>
                    <span style={{ fontSize: 10.5, letterSpacing: '.1px', fontWeight: 700, color: 'var(--gw-sub-d)', display: 'block', marginBottom: 2 }}>What people said</span>
                    {r.what}
                  </div>

                  {/* The signal is ALWAYS coupled to the reason it cannot self-determine. */}
                  <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.4, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 9, padding: '7px 10px' }}>
                    <span style={{ fontSize: 10.5, letterSpacing: '.1px', fontWeight: 700, color: 'var(--gw-sub-d)', display: 'block', marginBottom: 2 }}>
                      Which of the four this is
                    </span>
                    {r.reasonText}
                  </div>

                  {r.basis && (
                    <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--gw-muted)', lineHeight: 1.45 }}>{r.basis}</div>
                  )}

                  <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.4, border: '1px dashed var(--gw-border)', borderRadius: 9, padding: '6px 10px', color: 'var(--gw-muted)', fontStyle: 'italic' }}>
                    {r.ownVoice ?? 'No note. This person can add context through their next check-in.'}
                  </div>
                </div>
              ))}

              {b.coverage.reads.some((r) => r.shown === false) && (
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 9, lineHeight: 1.45 }}>
                  {b.coverage.reads.filter((r) => r.shown === false).map((r) => r.name).join(', ')} {b.coverage.reads.filter((r) => r.shown === false).length === 1 ? 'is' : 'are'} not shown here yet. There is too little on record to say anything about where their work is landing, and a guess about that would be worse than a gap.
                </div>
              )}

              <div style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontStyle: 'italic', marginTop: 11, paddingTop: 9, borderTop: '1px dashed var(--gw-border)', lineHeight: 1.5 }}>
                Other people doing your work can mean several different things. Nobody may own it any more, and others are quietly
                covering the gap. It may be healthy work shared by design. You may be blocked or carrying too much. Or someone else may
                be taking over your role without being asked to. This shows the signal, but it cannot tell which of these is happening on
                its own, so it is shown alongside what you are waiting on, how clearly your role is defined, and your own voice. It never
                concludes that you have stopped contributing. It raises a question for the team to discuss, never a verdict about a
                person. It is only shown where the role is defined, because an undefined boundary has no coverage to measure.
              </div>
            </Card>
          </>
        )}

        {/*
         * MANAGER ALIGNMENT IS A PATTERN CLAIM. Its pattern code is SETUP_NEVER_SAID and it says
         * "seen across 2 sessions" from one, which is exactly what PATTERNS_ARE_SERVED being off is
         * meant to stop the board from doing (see api/src/modules/patterns/patterns-are-served.ts).
         * The server still sends this field on its own, outside `sections`, so the screen checks
         * `has('patterns')` - the same flag the server itself uses to decide whether the `patterns`
         * section belongs in `sections` - as its own guard, and draws nothing here while it is off.
         * The data is kept (nothing is deleted); only the drawing stops.
         */}
        {has('patterns') && viewerRunsThisCheckIn && b.managerAlignment && b.managerAlignment.length > 0 && (
          <>
            <Sec title="How the leading is landing" src="two sides of the same leadership" />
            <Card>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', padding: '6px 0 2px' }}>
                Where one person's read of how this team is being led differs from another's. Neither is called wrong.
              </div>
              {b.managerAlignment.map((m, i) => (
                <Row key={i}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)' }}>{m.label}</span>
                    {/* The pole matters more than the gap: holding on to everything
                        and holding nobody need opposite responses, and telling one
                        to do the other makes it worse. */}
                    {m.pole !== 'NEITHER' && (
                      <Pill tone="info">
                        {m.pole === 'CONTROL' ? 'nobody else gets to own it' : 'nobody is being held to it'}
                      </Pill>
                    )}
                    <span style={{ fontSize: 10.5, color: 'var(--gw-muted)', marginLeft: 'auto' }}>
                      seen across {m.periods} sessions
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--gw-text)', marginTop: 4, lineHeight: 1.45 }}>{m.gap}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4, lineHeight: 1.45 }}>{m.note}</div>
                </Row>
              ))}
              <div style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontStyle: 'italic', padding: '10px 0', borderTop: '1px dashed var(--gw-border)', marginTop: 4, lineHeight: 1.5 }}>
                Neither read is called wrong. Something can be set clearly and still not land, and both people can be describing
                their own experience honestly. This shows that two sides of the same leadership differ, never who said what, and it
                is a prompt for a conversation rather than a finding about anyone.
              </div>
            </Card>
          </>
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
          <>
            <Sec title="Named here, and not in this check-in" src="from what people said" />
            <Card>
              {b.hiddenContributors.rows.map((r, i) => (
                <Row key={r.label + i} first={i === 0}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{r.evidence}</div>
                </Row>
              ))}
              <Row>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>{b.hiddenContributors.why}</div>
              </Row>
            </Card>
          </>
        )}

        {shown.patterns && <Zone label="The record over time" />}

        {shown.patterns && b.patterns && (
          <>
            <Sec title="Patterns this phase" src="work patterns only" />
            <Card>
              {b.patterns.length === 0 ? (
                <Row first><div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>No patterns have repeated often enough to show yet. A pattern needs three periods before it appears here.</div></Row>
              ) : b.patterns.map((p, i) => (
                <Row key={i} first={i === 0}>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'baseline' }}>
                    {p.label && <Pill tone="info">{p.label}</Pill>}
                    <span style={{ flex: 1, fontSize: 12.5 }}>{p.text}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--gw-muted)', flexShrink: 0 }}>{p.periods} periods</span>
                  </div>
                  {/*
                    AND WHAT TO DO ABOUT IT.

                    "i would expect a coaching line or an assessment after, what do i do with this" -
                    about "Direct questions about deliverables were met with unrelated statements
                    about needs and blockers." An observation with no next move is a dead end on the
                    one board somebody opens to decide something.

                    The library has carried the question for every pattern since it was written; the
                    server now sends it. A QUESTION and not a verdict, because a pattern is a thing
                    the record has noticed more than once, and the next move is asking the person.
                  */}
                  {(p as any).askThem && (
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55, marginTop: 6, paddingLeft: 11, borderLeft: '2px solid var(--gw-border)' }}>
                      <span style={{ color: 'var(--gw-muted)' }}>Ask them: </span>
                      {(p as any).askThem}
                    </div>
                  )}
                </Row>
              ))}
              <div style={{ fontSize: 10.5, color: 'var(--gw-muted)', fontStyle: 'italic', padding: '10px 0', borderTop: '1px dashed var(--gw-border)', marginTop: 4, lineHeight: 1.5 }}>
                Patterns about the work only. Anything that would read as a judgement about a person stays in the lead's private report and never appears here.
              </div>
            </Card>
          </>
        )}

        {/* ---------------------------------------------- logistics */}
        {has('poll') && (
          <>
            <Zone label="Logistics" />
            <Sec title="Find a time" src="the only thing you set up here" />
            <Card>
              {b.canEditFrame && (
                <div style={{ padding: '8px 0', borderBottom: b.poll ? '1px solid var(--gw-border)' : 'none' }}>
                  {!showPollForm ? (
                    <button onClick={() => { setShowPollForm(true); setPollQ(b.poll?.question ?? 'Weekly sync, best time'); setPollOpts((b.poll?.options ?? []).map((o) => o.label).join('\n')) }}
                      style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>
                      {b.poll ? 'Change the times' : 'Set up an availability poll'}
                    </button>
                  ) : (
                    <form noValidate onSubmit={(e) => { e.preventDefault(); if (pollQ.trim() && pollOpts.trim() && !savePoll.isPending) savePoll.mutate() }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="What are you finding a time for?"
                        style={{ padding: '7px 10px', fontSize: 12.5, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none' }} />
                      <textarea value={pollOpts} onChange={(e) => setPollOpts(e.target.value)} placeholder={'One time per line\nTue 16:00\nWed 09:00'}
                        style={{ minHeight: 68, padding: '7px 10px', fontSize: 12.5, border: '1px solid var(--gw-border)', borderRadius: 7, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                      {b.poll && (
                        <div style={{ fontSize: 11, color: 'var(--gw-amber-t)' }}>
                          Changing the times clears everyone's availability, because an answer to a question that changed is not an answer.
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" disabled={!pollQ.trim() || !pollOpts.trim() || savePoll.isPending}
                          style={{ ...btn, padding: '7px 14px', fontSize: 12.5, opacity: !pollQ.trim() || !pollOpts.trim() || savePoll.isPending ? 0.5 : 1 }}>
                          {savePoll.isPending ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" onClick={() => { if (pollQ.trim() || pollOpts.trim()) setPollCancelArmed(true); else setShowPollForm(false) }} style={{ ...btnGhost, padding: '7px 12px', fontSize: 12.5 }}>Cancel</button>
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
                <Row first><div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>No availability poll yet.</div></Row>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)', padding: '4px 0' }}>
                    {b.poll.question}
                    <span style={{ fontSize: 10.5, color: 'var(--gw-navy)', fontWeight: 600, marginLeft: 8 }}>tap your name to mark availability</span>
                  </div>
                  {b.poll.options.map((o, i) => {
                    const max = Math.max(...b.poll!.options.map((x) => x.count))
                    const win = o.count === max && max > 0
                    return (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)', background: win ? 'var(--gw-green-bg)' : 'transparent', borderRadius: win ? 9 : 0, margin: win ? '2px -8px' : 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, minWidth: 110 }}>{o.label}</div>
                        {/* Only YOUR OWN availability is clickable. Everyone else is a
                            read-only indicator: the toggle endpoint acts on the caller,
                            so a clickable chip bearing someone else's name would set
                            your availability while appearing to set theirs. */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1, alignItems: 'center' }}>
                          <button
                            onClick={() => togglePoll.mutate(o.id)}
                            disabled={togglePoll.isPending}
                            title="Toggle your own availability for this time"
                            style={{
                              fontSize: 10.5, fontWeight: 700, borderRadius: 13, padding: '3px 10px',
                              cursor: togglePoll.isPending ? 'wait' : 'pointer', fontFamily: 'inherit',
                              background: o.whoIds.some((w) => myIds.has(w)) ? 'var(--gw-blue-bg)' : '#F1F2F5',
                              color: o.whoIds.some((w) => myIds.has(w)) ? 'var(--gw-blue-t)' : 'var(--gw-sub)',
                              border: '1px solid ' + (o.whoIds.some((w) => myIds.has(w)) ? 'var(--gw-blue-b)' : 'var(--gw-border)'),
                            }}
                          >
                            {o.whoIds.some((w) => myIds.has(w)) ? '✓ you can make this' : 'I can make this'}
                          </button>
                          {o.who.filter(Boolean).length > 0 && (
                            <span style={{ fontSize: 10.5, color: 'var(--gw-muted)' }}>
                              also: {o.who.filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: win ? 'var(--gw-green-t)' : 'var(--gw-sub)', minWidth: 42, textAlign: 'right', fontWeight: win ? 700 : 400 }}>{o.count} in</div>
                      </div>
                    )
                  })}
                </>
              )}
            </Card>
          </>
        )}

        {/*
          THE ALIGNMENT FEED, ON THE BOARD RATHER THAN ON THE SESSIONS TAB.

          "The alignment feed should be in the reports and board, not here." It was on Sessions -
          the tab about who has answered and when - where it competed with the session grid and had
          nothing to do with it. What it actually is: convergences and divergences accumulating
          across the run, which is the board's subject exactly.
        */}
                {viewerRunsThisCheckIn && (((groundForSignals as any)?.signals ?? [])).length > 0 && (() => {
                  const sigs = ((groundForSignals as any)?.signals ?? [])
                  /* Every row is the library's own sentence for a surfaced pattern. The badge is a
                     count: good signs against patterns to look at, never a verdict word. */
                  const convergences = sigs.filter((s: any) => s.type === 'Good sign').length
                  const divergences = sigs.filter((s: any) => s.type === 'Pattern').length
                  /* A third kind, and it is neither. Somebody holding together what nobody else
                     picked up is not a good sign and is not a problem with them; counted as either
                     it says something untrue, and left out of both counts it vanishes off a badge
                     that claims to say how many there are. */
                  const carrying = sigs.filter((s: any) => s.type === 'Carrying').length
                  const trendLabel = [
                    `${divergences} to look at`,
                    `${convergences} good sign${convergences === 1 ? '' : 's'}`,
                    ...(carrying ? [`${carrying} carrying`] : []),
                  ].join(' · ')
                  const trendColor = divergences === 0 ? 'var(--gw-green-t)' : 'var(--gw-amber-t)'
                  const trendBg = divergences === 0 ? 'var(--gw-green-bg)' : 'var(--gw-amber-bg)'
                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Alignment feed</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: trendBg, color: trendColor }}>{trendLabel}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sigs.map((sig: any) => (
                          <div key={sig.id} style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '11px 13px' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, ...badgeColoursFor(sig.type) }}>{sig.type}</span>
                              <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Seen across {sig.periodsObserved ?? sig.sessionNum} session{(sig.periodsObserved ?? sig.sessionNum) === 1 ? '' : 's'}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.55 }}>{sig.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

        {/*
          THE WHOLE RUN, IN ONE PLACE. "I need the board to carry the entire history in one place."

          The board read only the CURRENT working copy of the report plus the record entries, so a
          six-session run showed its latest state and nothing about how it got there - while the
          per-round snapshots sat in `report_rounds`, immutable, one row per closed round, read by
          a component that lived on the report tab.

          Both come here: what the report said at the end of each round, and where the run finished
          if it has. This is now the only screen that carries the arc, which is why the report tab
          could become a list of sessions.
        */}
        <div style={{ marginTop: 26 }}>
          <HowThisHasMoved groundId={id!} viewerRunsThisCheckIn={viewerRunsThisCheckIn} />
        </div>
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
            <div style={{ marginTop: 14 }}>
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
        <details className="gw-legend" style={{ marginTop: 28 }}>
          <summary style={{ fontSize: 12, color: 'var(--gw-sub)', cursor: 'pointer' }}>How this board is put together</summary>
          <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
            {[
              { h: 'What is open, first', p: 'It leads with what is still unresolved and what everyone already agrees on. The read across everything people said follows it.' },
              { h: 'Each gap names both sides', p: "Every disagreement carries each person's position in their own words, and what is at stake if it holds. The most significant comes first." },
              { h: 'Honest closes', p: 'Decisions rarely finish clean, so it names what is aligned, what is open, and the question the whole thing turns on. It never gives a verdict on a person.' },
            ].map((cell, i) => (
              <div key={i}>
                <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gw-muted)', fontWeight: 700, marginBottom: 4 }}>{cell.h}</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{cell.p}</div>
              </div>
            ))}
          </div>
        </details>

        {/*
          THE FOOTER IS GONE. It said "Everyone on this check-in sees the same board. It regenerates as
          people check in each session." Neither is true: each reader is served what they may read, and
          opening the board rebuilds nothing. The line at the top says what is true.
        */}
      </div>
    </div>
  )
}

