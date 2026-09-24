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
import { boardApi, type BoardPresent, type CoverageVariant } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
// The board's own vocabulary now lives in components/gw/kit so every other page
// can be rebuilt from it. Values unchanged: this is an extraction, not a redesign.
import { Zone, Sec, Card, Row, Pill, td, btn, miniBtn, btnGhost } from '@/components/gw/kit'
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
import { WhereEachPersonIs } from '@/components/gw/where-each-person-is'
import { SplitOneTotalAcrossPeople } from '@/components/gw/split-one-total-across-people'

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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['board', id, variant],
    queryFn: () => boardApi.get(id!, variant),
    enabled: !!id,
    retry: false,
  })

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
  const onlyOnePersonHere = (b.participants ?? []).filter(p => !p.managingOnly).length < 2

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
  const shown = {
    quickRead: has('quickRead') && !!b.quickRead,
    startingState: has('startingState') && !!b.startingState,
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
    objectives: has('objectives') && (!!b.objectives?.length || !!b.canEditFrame),
    cascade: has('cascade') && !!b.cascade,
    hiddenContributors: has('hiddenContributors') && !!b.hiddenContributors?.rows?.length,
    divergence: has('divergence') && !!b.divergence,
    /* The note stands in for the block before a round has closed, so either one is enough to show. */
    whatTheRoomIsAbout: has('whatTheRoomIsAbout')
      && (!!b.whatTheRoomIsAbout?.aims.length || !!b.whatTheRoomIsAbout?.places.length
        || !!b.whatTheRoomIsAbout?.things.length || !!b.whatTheRoomIsAboutNote),
    whoOwnsWhat: has('whoOwnsWhat') && !!b.whoOwnsWhat,
    dependencies: has('dependencies') && !!b.dependencies,
    checkInGrid: has('checkInGrid') && !!b.checkInGrid,
    /* Lead-only and absent for everybody else, so there is nothing to gate on here beyond its
       presence: the server does not send it to a reader who may not have it. */
    eachPerson: !!b.eachPerson?.length,
    contribution: has('contribution') && !!b.contribution,
    coverage: has('coverage') && !!b.coverage,
    patterns: has('patterns') && !!b.patterns,
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
                  <span>
                    {b.phaseSpine.startsAt || b.phaseSpine.endsAt
                      ? `${dshort(b.phaseSpine.startsAt)} to ${dshort(b.phaseSpine.endsAt)} · `
                      : ''}
                    {/* Counted the way the exit gate below counts it: sessions everybody has finished.
                        `currentSession` is the highest number any row carries, and the next row is
                        created the moment one completes, so it ran ahead of the run. */}
                    {/* ONCE, NOT TWICE. "0 sessions done" sat three inches above "Progress 0 of 6
                        rounds" on the same header - the same fact, in two vocabularies, and the
                        progress line is the one that says how many there are to do. */}
                    {(() => {
                      const done = ((b.phaseSpine.sessions ?? []) as { state: string }[]).filter((x) => x.state === 'done').length
                      return done > 0 ? `${done} ${done === 1 ? 'session' : 'sessions'} done` : null
                    })()}
                  </span>
                ) : null}
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: BOARD_MUTED_INK, textAlign: 'right', lineHeight: 1.5 }}>
              {b.readOnlyNote.split('. ').map((l, i) => <div key={i}>{l}</div>)}
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
                  const face = (
                    <>
                      {/* "now" on a check-in that has ended is a clock nobody is watching. */}
                      Session {s.n}{s.date ? ` · ${dshort(s.date)}` : s.opensOn && s.state !== 'done' ? ` · opens ${dshort(s.opensOn)}` : ''}{s.state === 'current' && !groundEnded ? ' · now' : ''}
                    </>
                  )
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
          <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', color: BOARD_MUTED_INK, fontWeight: 700, display: 'block', marginBottom: 6 }}>
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
            <Sec title="Where people differ" src="cross-referenced" />
            <Card>
              {b.divergence.items.length === 0 && b.divergence.agreements.length === 0 ? (
                /* WHY IT IS EMPTY, NOT ONE SENTENCE FOR EVERY REASON. This said "This fills in once
                   more than one person has checked in" on a round where everybody had, three inches
                   under a tile that said so. The server computes it from the one counter. */
                <Row first><div style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>{onlyOnePersonHere ? 'Nothing to cross-reference yet.' : (b.divergence.whyNothingYet ?? 'Nothing cross-referenced yet. This fills in once more than one person has answered.')}</div></Row>
              ) : (
                <>
                  {b.divergence.items.map((d: any, i: number) => (
                    <Row key={i} first={i === 0}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)' }}>
                        {d.topic ?? d.tag ?? 'Somewhere you see it differently'}
                        <span style={{ marginLeft: 8 }}><Pill tone="warn">differs</Pill></span>
                      </div>
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
                      {Array.isArray(d.positions) && d.positions.length > 0 && (
                        <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
                          {d.positions.map((pos: any, j: number) => (
                            <div key={j} style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--gw-text)' }}>
                              <span style={{ fontWeight: 700 }}>{pos.participantLabel}</span>
                              <span style={{ color: 'var(--gw-sub)' }}>{pos.view ? ` - ${pos.view}` : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {d.atStake && (
                        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 5, lineHeight: 1.55 }}>
                          <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', fontWeight: 700, color: 'var(--gw-sub-d)' }}>Why it matters </span>
                          {d.atStake}
                        </div>
                      )}
                    </Row>
                  ))}
                  {b.divergence.agreements.map((a: any, i: number) => (
                    <Row key={`a${i}`}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-dark)' }}>
                        {typeof a === 'string' ? a : a.topic ?? 'Agreed'}
                        <span style={{ marginLeft: 8 }}><Pill tone="good">agreed</Pill></span>
                      </div>
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

        {/* ---------------------------------------------- at a glance */}
        {(shown.quickRead || shown.startingState || shown.decisions || shown.eachPerson) && <Zone label="At a glance" />}

        {/*
          ABOVE THE QUICK READ, BECAUSE IT IS WHAT THIS PAGE IS OPENED FOR.

          The quick read is four facts about the check-in. This is ten rows about ten people, each
          with the one thing to ask for, and a manager running a team against individual numbers
          reads it first and often reads nothing else. Putting it under the tiles would be ordering
          the page by how long each block has existed.
        */}
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
            <TheJudgement it={(b as any).theJudgement} table={(b as any).theTable} />
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
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, marginTop: 5, lineHeight: 1, color: tone }}>{q.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>{q.sub}</div>
                  </div>
                )
              })}
            </div>
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

        {shown.decisions && b.decisions && (
          <>
            <Sec title="Decisions needed" src="from divergences and blockers" />
            <Card>
              {b.decisions.map((d, i) => (
                <Row key={i} first={i === 0}>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 17, color: 'var(--gw-navy)', minWidth: 18 }}>{i + 1}</span>
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
        {(shown.objectives || shown.divergence || shown.cascade) && <Zone label="Against the plan" />}

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
                        {/* WHOSE NUMBER IT IS, on the row. Nine rows read from one sheet are nine
                            people's, and the board listed them exactly as it listed the team's. */}
                        {o.owner && <span style={{ marginLeft: 7, fontWeight: 400, color: 'var(--gw-sub)', fontSize: 12 }}>· {o.owner}</span>}
                        {o.isNew && <span style={{ marginLeft: 7 }}><Pill tone="info">new</Pill></span>}
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
                              ? (<><b style={{ color: 'var(--gw-dark)' }}>{o.count}</b>{` · from ${o.journey.start}, said ${o.target}`}</>)
                              : (<><b style={{ color: 'var(--gw-dark)' }}>{o.count}</b>{` of ${o.target}`}</>)}
                          </div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, minWidth: 92, textAlign: 'right', color: o.delta > 0 ? 'var(--gw-green-t)' : 'var(--gw-muted)' }}>
                            {o.delta > 0 ? `+${o.delta} this session` : 'no change'}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', minWidth: 92, textAlign: 'right' }}>no number set</div>
                      )}
                    </div>
                    {o.notSettled && (
                      <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', marginTop: 5, lineHeight: 1.55, maxWidth: '68ch' }}>{o.notSettled}</div>
                    )}
                      {b.canEditFrame && (
                        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button
                            onClick={() => bumpObjective.mutate({ objectiveId: o.id, count: Math.max(0, o.count - 1) })}
                            disabled={(bumpObjective.isPending && bumpObjective.variables?.objectiveId === o.id) || o.count === 0}
                            title="Move this count down"
                            aria-label={`One fewer: ${o.name}`}
                            style={miniBtn}
                          >-</button>
                          <button
                            onClick={() => bumpObjective.mutate({ objectiveId: o.id, count: o.count + 1 })}
                            disabled={bumpObjective.isPending && bumpObjective.variables?.objectiveId === o.id}
                            title="Move this count up"
                            aria-label={`One more: ${o.name}`}
                            style={miniBtn}
                          >+</button>
                          <button
                            onClick={() => sureAboutTarget.arm(o.id)}
                            disabled={removeObjective.isPending}
                            title="Remove this target"
                            aria-label={`Remove target: ${o.name}`}
                            style={{ ...miniBtn, color: 'var(--gw-clay)' }}
                          >x</button>
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
                        Asked about this so far:{' '}
                        {o.askedOf.filter((a) => a.asked).map((a) => a.name).join(', ') || 'nobody yet'}
                        {o.askedOf.some((a) => !a.asked) && (
                          <> · still to be asked: {o.askedOf.filter((a) => !a.asked).map((a) => a.name).join(', ')}</>
                        )}
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


        {/* ---------------------------------------------- the work */}
        {(shown.whoOwnsWhat || shown.dependencies || shown.checkInGrid) && <Zone label="The work" />}

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

        {shown.whoOwnsWhat && b.whoOwnsWhat && (
          <>
            {/* AN UPDATE HAS NO OWNERSHIP TO READ. Its per-person cards are the answers to the lead's one line. */}
            {b.family === 'UPDATE'
              ? <Sec title="What each person said" src="their answers to the question, in their words" />
              : <Sec title="Who owns what" src="extracted from check-ins" />}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
              {b.whoOwnsWhat.map((p) => (
                <Card key={p.participantId} pad={false}>
                  <div style={{ padding: '13px 15px 10px', borderBottom: '1px solid var(--gw-border)' }}>
                    {/*
                      The server falls back from a missing name to the ROLE rather than the email
                      address (W-UX-4), so the subtitle has to stop repeating it - otherwise a person
                      with no account yet reads "Engineer" over "Engineer".
                    */}
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)' }}>{p.name ?? 'A teammate'}</div>
                    {p.role && p.role !== p.name && <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 1 }}>{p.role}</div>}
                  </div>
                  <div style={{ padding: '2px 15px 10px' }}>
                    {p.items.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--gw-muted)', padding: '10px 0' }}>{b.family === 'UPDATE' ? 'Has not answered yet.' : 'Nobody has said anything about this yet.'}</div>
                    ) : p.items.map((it, i) => (
                      <div key={it.id} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)' }}>
                        <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>{it.text.replace(/^\[VERIFIABILITY:[A-Z]+\]\s*/, '')}</div>
                        <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                          {/* Record types are the goal vocabulary; an update's answers are not "success definitions". */}
                          {b.family !== 'UPDATE' && <Pill>{it.type.toLowerCase().replace(/_/g, ' ')}</Pill>}
                          {it.sessionNumber && <span style={{ fontSize: 10.5, color: 'var(--gw-muted)' }}>session {it.sessionNumber}</span>}
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

        {shown.checkInGrid && b.checkInGrid && (() => {
          /** Does any row have a role worth a column of its own? */
          const anyRoleToShow = b.checkInGrid.rows.some((r) => (r.role && r.role !== r.name) || r.managingOnly)
          return (
          <>
            <Sec title="Sessions this phase" src="from sessions" />
            <Card>
              {/*
                A GRID OF PEOPLE BY SESSIONS IS THE RIGHT SHAPE UNTIL THE SCREEN IS NARROWER THAN
                IT IS. Measured on the running board at 375px: 1088px of table inside a 301px box,
                nine pills behind a scrollbar, names wrapping to two lines to make room for it.
                The phone gets the same facts down the page instead - see the component.
              */}
              {onAPhone ? (
                <NineColumnsIsNotAPhoneScreen rows={b.checkInGrid.rows as any} sessions={b.checkInGrid.sessions} />
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
                        <td style={td}><span style={{ fontWeight: 700, color: 'var(--gw-dark)' }}>{r.name ?? 'A teammate'}</span></td>
                        {anyRoleToShow && (
                          <td style={{ ...td, color: 'var(--gw-sub)' }}>
                            {r.role && r.role !== r.name ? r.role : r.managingOnly ? 'Managing only' : ' - '}
                          </td>
                        )}
                        {b.checkInGrid!.sessions.map((s) => {
                          const v = r.cells[String(s)] ?? 'na'
                          return (
                            <td key={s} style={td}>
                              {v === 'na' ? <span style={{ color: 'var(--gw-muted)' }}> - </span>
                                : <Pill tone={v === 'done' ? 'good' : v === 'in-progress' ? 'info' : v === 'declined' ? 'bad' : 'flat'}>
                                    {v === 'done' ? 'Checked in' : v === 'in-progress' ? 'In progress' : v === 'declined' ? 'Declined' : 'Not started'}
                                  </Pill>}
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
            <Sec title="Contribution against role" src="each role, own terms" />
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
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 14 }}>{c.name}</span>
                    {c.remitDefined
                      ? <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>{c.remit}</span>
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
                        <b style={{ color: 'var(--gw-dark)' }}>Why:</b> {c.reason}
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
                    <span style={{ fontWeight: 700, color: 'var(--gw-dark)', fontSize: 14 }}>{r.name}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{r.scope} level</span>
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

                  <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45 }}>
                    <b style={{ color: 'var(--gw-dark)' }}>What people said:</b> {r.what}
                  </div>

                  {/* The signal is ALWAYS coupled to the reason it cannot self-determine. */}
                  <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.4, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 9, padding: '7px 10px' }}>
                    <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', fontWeight: 700, color: 'var(--gw-sub-d)', display: 'block', marginBottom: 2 }}>
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
                Other people doing your work can mean four different things: an ownership drop (others covering a gap), healthy shared
                work by design, you being blocked or overloaded, or someone else over-reaching into your role. This shows the signal and
                the reason it cannot tell which on its own, two-sided, coupled to the waiting-on and role-clarity views, with your own
                voice. It never concludes you stopped contributing. It surfaces a question the team should discuss, not a verdict about a
                person. Only shown where the role is defined, an undefined boundary has no coverage to measure.
              </div>
            </Card>
          </>
        )}

        {b.managerAlignment && b.managerAlignment.length > 0 && (
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
            <Sec title="Find a time" src="the one thing you add" />
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
          <HowThisHasMoved groundId={id!} />
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
          const spine = (data as any)?.phaseSpine
          const sessions = (spine?.sessions ?? []) as { state: string }[]
          /*
           * PLANNED sessions, not the ones that happen to have rows yet.
           *
           * Driven on a check-in at session 1 of 6, and the exit appeared. `phaseSpine.sessions`
           * lists only the session numbers check-in rows exist for - two of them, at that point -
           * so "done >= total - 1" was 1 >= 1 and read as the end of the run. The run's length
           * comes from the check-in's own timeline and cadence, which is what the header counts
           * to say "Session 1 of 6".
           */
          const planned = plannedSessionsFor(
            (groundForSignals as any)?.timelineDays,
            (groundForSignals as any)?.cadence,
            (groundForSignals as any)?.plannedSessions,
          )
          const done = sessions.filter((x) => x.state === 'done').length
          const nearTheEnd = planned != null && planned > 0 && done >= planned - 1
          return (
            <div style={{ marginTop: 14 }}>
              <ResolutionPanel groundId={id!} nearTheEnd={nearTheEnd} />
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

        <div style={{ color: 'var(--gw-muted)', fontSize: 10.5, textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
          Groundwork board · confidential · generated from the check-in.<br />
          Everyone on this check-in sees the same board. It regenerates as people check in each session.<br />
          The mode is fixed at creation, so a private alignment check-in can never be read this way.
        </div>
      </div>
    </div>
  )
}

