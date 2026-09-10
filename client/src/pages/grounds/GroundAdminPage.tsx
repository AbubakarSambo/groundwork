import { howItEnded } from '@/lib/a-ground-that-has-ended'
import { plannedSessionsFor, everySessionDone } from '@/lib/sessionCount'
import { hasDoneThisSession, whichSessionIsThisCheckInOn } from '@/lib/which-session-are-we-on'
import { useState, useEffect } from 'react'
import { railAttention } from '@/lib/rail-attention'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ContextPage } from '@/components/gw/ContextPage'
import { GroundChat } from '@/components/gw/GroundChat'
import { MyRecord } from '@/components/gw/MyRecord'
import { MyParticipation } from '@/components/gw/MyParticipation'
import { GroundGone } from '@/components/gw/GroundGone'
import { useAuthStore } from '@/stores/auth'
import { groundsApi, type GroundCadence } from '@/api/grounds'
import { authApi } from '@/api/auth'
import { PeoplePicker } from '@/components/gw/PeoplePicker'
import { SELECTABLE_CADENCES, sessionsFor } from '@/lib/cadence'
import { personLabel } from '@/lib/utils'
import { stepsYouHaveChecked, rememberYouCheckedIt, forgetYouCheckedIt, howFarThroughSetup } from './the-setup-steps-you-have-checked'
import { TheReportIsAListOfSessions, type SessionRow } from '@/components/gw/TheReportIsAListOfSessions'
import { alignmentLabel } from '@/lib/alignment'
import { reportsApi } from '@/api/reports'
import { conversationApi } from '@/api/conversation'
import { participantRequestsApi } from '@/api/participantRequests'
import { participantsApi } from '@/api/participants'
import type { ParticipantRequest } from '@/api/participantRequests'
import { toast } from 'sonner'
import { CodeShareCard } from '@/components/CodeShareCard'
import { PostSessionPanel } from '@/components/PostSessionPanel'
import { Sec } from '@/components/gw/kit'
import { groundTabs } from './ground-tabs'
import { SoloReportBody } from '@/components/gw/SoloReportBody'
import { WhatYourRecordCanSupport } from '@/components/gw/WhatYourRecordCanSupport'
import { WhatYouAreCarryingForward } from '@/components/gw/WhatYouAreCarryingForward'
import { TheFiveThingsThatMakeItCheckable } from '@/components/gw/TheFiveThingsThatMakeItCheckable'
import { BaselinePanel } from '@/components/gw/BaselinePanel'
import { StartingPointPanel } from '@/components/gw/StartingPointPanel'
import { GroundTabRow } from '@/components/gw/GroundTabRow'
import { billingApi } from '@/api/billing'
import { scenarioLabel } from '@/lib/scenario-catalog'
import { whoWasNotInvited, rememberWhoWasNotInvited, thatIsDealtWith, whatToSayAboutThem, type NotInvited } from './who-was-not-invited'

/**
 * THE THIRD COPY OF THE SITUATION NAMES, DELETED.
 *
 * A fourteen-entry map lived here, and it was not merely a different vocabulary from the picker -
 * two entries were wrong about what the situation IS. `DRIFT` rendered as "New direction", which
 * describes deciding to change course; DRIFT is a project that has quietly stopped matching what
 * was agreed. `REALIGN_TEAM` rendered as "Other", the label for a situation nobody could name,
 * applied to the one that is specifically about two people reading the same thing differently.
 * `PIP` rendered as the raw acronym.
 *
 * Four situations were absent entirely - RECOGNITION, ACUTE_SHOCK, CRISIS_ALIGNMENT and OPEN_READ -
 * so a lead opening one of those read a title-cased enum value on their own admin page.
 *
 * `scenarioLabel` carries the same title-casing fallback, so nothing regresses for a scenario added
 * to the enum before the catalog. See scenario-catalog.ts.
 */

/** Kept for the party page and the list, which still name the moment. The header here no longer shows it. */
export const MOMENT_LABELS: Record<string, string> = {
  STARTING: 'Starting',
  RECOGNITION: 'Recognition',
  RESOLUTION: 'Resolution',
}



/**
 * THE CHAT WENT MISSING FROM THIS VIEW, AND I DID NOT NOTICE. W8-67.
 *
 * Her words: "the chat like slack disappear again, what is happening".
 *
 * It never disappeared from the code - it disappeared from HALF THE PRODUCT. GroundChat
 * is mounted by `GroundParticipantPage` only. So a participant lands in the conversation
 * and a LEAD or an ORG ADMIN, opening the same ground, gets a list of session cards and no
 * chat anywhere. When the card view was retired (46321a0) the rail toggle and
 * `stores/view.ts` went with it, correctly - but the retirement was done on the
 * participant page and this one was left as it was.
 *
 * So 'chat' is the first tab here too, and the card list keeps its own tab rather than
 * being deleted: a lead scanning twelve sessions for who has not checked in wants the
 * list, and that is a genuinely different question from reading what was said.
 */
type Tab = 'chat' | 'overview' | 'checkins' | 'myrecord' | 'docs' | 'report' | 'settings'

/**
 * The shared tab keys from `ground-tabs.ts`, and this page's own older names for the same tabs.
 * Both directions, in one place, so the URL and the tab row cannot disagree about what `context`
 * means.
 */
const FROM_TAB_KEY: Record<string, Tab> = {
  chat: 'chat', report: 'report', sessions: 'checkins', context: 'docs', settings: 'settings',
  /**
   * `record` MEANS ONE THING NOW, AND IT IS SOMEBODY'S OWN.
   *
   * On this page `?tab=record` used to open Sessions - everyone's state - while on the party view
   * the same key opened your own account. That collision is what made the two views impossible to
   * tell apart, and step one split them: `sessions` for everyone's, `record` for yours.
   *
   * This kept `record: 'checkins'` for a while so links written before that still landed somewhere
   * sensible. It cannot stay: this page shows both tabs now, so the key has to pick one, and the
   * honest pick is the meaning it has everywhere else.
   *
   * A link written before step one now opens My record rather than Sessions. Both are on this page,
   * one tab apart, which is a nudge in the wrong direction rather than a broken link.
   */
  record: 'myrecord',
}
const TO_TAB_KEY: Partial<Record<Tab, string>> = {
  chat: 'chat', report: 'report', checkins: 'sessions', myrecord: 'record', docs: 'context', settings: 'settings',
}


/**
 * ONE SETUP QUESTION AT A TIME.
 *
 * "The setup page is still messy and hard to go through" - said after the tab had already been cut
 * into five named, numbered bands. Naming them was not the fix, because all five were still open
 * at once: about five hundred lines of controls, so finding the timeframe meant scrolling past
 * everybody's invitation and reading two privacy toggles on the way.
 *
 * Five rows now, each saying what it is currently set to. Open one and the rest close. The numbers
 * stay, because they are the order the questions were asked in when the check-in was set up.
 */
function Fold({
  n, title, src, summary, open, onToggle, children, checked, onCheck,
}: {
  n: number
  title: string
  src: string
  summary: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  /** Whether the person has signed this question off. See the-setup-steps-you-have-checked.ts. */
  checked?: boolean
  onCheck?: () => void
}) {
  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, background: 'white', marginBottom: 8, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '13px 14px',
          background: open ? 'var(--gw-paper-2)' : 'white', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        {/*
          THE NUMBER, OR A TICK ONCE IT HAS BEEN SIGNED OFF.
          The tick takes the number's place rather than sitting beside it: a row carrying both a
          number and a tick is two marks for one thing, and the order is what the numbers are for.
        */}
        <span style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
          background: checked ? 'var(--gw-green-b)' : open ? 'var(--gw-navy)' : 'var(--gw-bg)',
          color: checked ? 'white' : open ? 'white' : 'var(--gw-muted)', fontSize: 10.5, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{checked ? '\u2713' : n}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gw-text)' }}>{title}</span>
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 1 }}>{open ? src : summary}</span>
        </span>
        <span style={{ flexShrink: 0, fontSize: 15, color: 'var(--gw-muted)' }}>{open ? '\u2212' : '+'}</span>
      </button>
      {open && <div style={{ padding: '2px 14px 14px', borderTop: '1px solid var(--gw-border)' }}>{children}</div>}
      {/*
        SIGNING IT OFF, AT THE BOTTOM OF THE QUESTION YOU HAVE JUST READ.

        STILL NOT ON THE CLOSED ROW, and that half of the original reasoning holds: a tick beside a
        heading nobody has opened is a tick somebody can press without reading, which is the
        opposite of the point. Opening the question is what puts the answer on screen.

        WHAT WAS WRONG WITH WHERE IT WAS. "the setup check but that says i have checked this is
        hidden and not very visible." It sat directly under the fold's own header, above the content
        - so it was passed on the way IN, before there was anything to sign off, as a bare line of
        text with a 15px box. Read as a caption on the heading, and missed.

        It is the last thing in the question now, on its own bar, which is where somebody arrives
        having actually read the answer. The closed row still turns its number into a tick, so the
        state is visible with everything shut; this is the act.
      */}
      {open && onCheck && (
        <div style={{ borderTop: '1px solid var(--gw-border)', background: checked ? 'var(--gw-green-bg)' : 'var(--gw-paper-2)' }}>
          <button
            onClick={onCheck}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '11px 14px',
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 600, textAlign: 'left',
              color: checked ? 'var(--gw-green-t)' : 'var(--gw-sub)',
            }}
          >
            <span style={{
              width: 17, height: 17, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${checked ? 'var(--gw-green-b)' : 'var(--gw-muted)'}`,
              background: checked ? 'var(--gw-green-b)' : 'white', color: 'white',
              fontSize: 11, lineHeight: '15px', textAlign: 'center', fontWeight: 700,
            }}>{checked ? '\u2713' : ''}</span>
            {checked ? 'You have signed this off' : 'I have read this - sign it off'}
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * "NOT INVITED YET" IS THREE DIFFERENT FACTS. The server names which (notInvitedBecause); this turns
 * the counts into sentences, one per fact, so a lead is never told "invited on the start date" about
 * somebody whose mail failed or who has no seat.
 */
function whyNotInvited(rows: ({ invitedAt?: string | null; notInvitedBecause?: string | null } | undefined)[]) {
  const why = { starts_later: 0, no_seat: 0, mail_failed: 0 }
  for (const r of rows) {
    if (!r || r.invitedAt) continue
    const k = (r.notInvitedBecause ?? 'starts_later') as keyof typeof why
    if (k in why) why[k]++
  }
  return why
}

function sentencesFor(why: { starts_later: number; no_seat: number; mail_failed: number }): string[] {
  const people = (n: number) => (n === 1 ? 'One person is' : `${n} people are`)
  const out: string[] = []
  if (why.starts_later) out.push(`${people(why.starts_later)} on the check-in and will be invited on the start date.`)
  if (why.no_seat) out.push(`${people(why.no_seat)} on the check-in and will be invited when an admin makes room on the plan.`)
  if (why.mail_failed) out.push(`${people(why.mail_failed)} on the check-in but the invitation did not send. Send it again from their row.`)
  return out
}

export function GroundAdminPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  /**
   * CHECK-INS FIRST, because that is what a ground is for.
   *
   * The page opened on Overview, which is the summary and the admin furniture, so
   * the first thing anybody saw about a live ground was a description of it rather
   * than the state of the work. Hafsah: "the checkin board should be the first tab
   * on these."
   *
   * The participant view already opens on Check-in; this makes the two agree.
   */
  /**
   * OPENS ON THE TAB THE URL ASKS FOR, so the old /report route can redirect here and land on the
   * report rather than the conversation. Without this the redirect would be a worse experience than
   * the page it replaced: a link somebody has in their email would drop them somewhere else.
   */
  const [searchParams, setSearchParams] = useSearchParams()
  /**
   * ?tab= SPEAKS THE SHARED TAB NAMES, NOT THIS PAGE'S PRIVATE ONES.
   *
   * It accepted this page's internal keys - including `overview`, a tab that no longer exists - so
   * `?tab=context` and `?tab=record`, the names the tab row itself uses and the only ones anybody
   * could reasonably guess, both silently fell through to the check-in. The participant page did not
   * read the parameter at all, so the same link behaved differently depending on who opened it.
   *
   * Same map the tab row uses below, so a link cannot mean one thing to the row and another here.
   */
  const [tab, setTab] = useState<Tab>(() => {
    const asked = searchParams.get('tab') ?? ''
    return FROM_TAB_KEY[asked] ?? (['chat', 'checkins', 'docs', 'report', 'settings'].includes(asked) ? (asked as Tab) : 'chat')
  })
  /** So a tab can be linked to and come back to. Replace, not push: tabs are not history. */
  const goTab = (t: Tab) => {
    setTab(t)
    const key = TO_TAB_KEY[t]
    const next = new URLSearchParams(searchParams)
    if (key) next.set('tab', key); else next.delete('tab')
    setSearchParams(next, { replace: true })
  }
  /* People the wizard could not invite, kept against this ground so the toast that faded is not
     the only record. Read once on mount: it is unfinished business, not live data. */
  const [notInvited, setNotInvited] = useState<NotInvited[]>(() => (id ? whoWasNotInvited(id) : []))
  const [groundLabel, setGroundLabel] = useState('')
  const [timelineDaysDraft, setTimelineDaysDraft] = useState(90)
  const [cadenceDraft, setCadenceDraft] = useState<GroundCadence>('WEEKLY')
  const [groundScenario, setGroundScenario] = useState('')
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false)
  const [newParticipantEmail, setNewParticipantEmail] = useState('')
  const { data: colleagues } = useQuery({ queryKey: ['colleagues'], queryFn: () => authApi.colleagues(), staleTime: 5 * 60 * 1000 })
  /** Whether the last person added is waiting for the start date rather than having been emailed. */
  const [lastInviteWaits, setLastInviteWaits] = useState(false)
  /** The server's own reason when an invitation is held for something other than the start date. */
  const [whyItWaits, setWhyItWaits] = useState<string | null>(null)
  const [newParticipantNote, setNewParticipantNote] = useState('')
  /* Optional, beside what they cover. Never inferred from the address; blank means blank. */
  const [newParticipantDepartment, setNewParticipantDepartment] = useState('')
  const [shareCodeModalOpen, setShareCodeModalOpen] = useState(false)
  /** Deleting a test check-in: the confirm step, and whatever the server refused with. */
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  /* Which setup question is open. One at a time; the first is open when the tab is reached.
     Declared up here with the rest: this component returns early for several ground states, and a
     hook below one of those returns is a hook that sometimes does not run. */
  const [openSetupBand, setOpenSetupBand] = useState<number>(1)
  /* The start date as typed, against the one on record, so the save button knows if anything moved. */
  const [startsAtDraft, setStartsAtDraft] = useState('')
  /* Which setup questions this person has signed off. Kept in this browser - see the module. */
  /**
   * A SIGN-OFF IS A RECORD NOW, so it is read from the server rather than from this browser. See
   * the-setup-steps-you-have-checked.ts for why it moved.
   */
  const { data: signedOff } = useQuery({
    queryKey: ['setup-sign-offs', id],
    queryFn: () => stepsYouHaveChecked(id!),
    enabled: !!id,
  })
  /* Held locally as well so a press shows instantly and does not wait on a round trip for a tick. */
  const [setupCheckedLocal, setSetupCheckedLocal] = useState<number[] | null>(null)
  const setupChecked = setupCheckedLocal ?? signedOff ?? []
  const [shareCodeId, setShareCodeId] = useState<string | null>(null)
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null)
  // Fix-and-resend for bounced invites (participant must not have accepted)
  const [fixingEmailId, setFixingEmailId] = useState<string | null>(null)
  const [fixingEmailValue, setFixingEmailValue] = useState('')
  const [postSessionDismissed, setPostSessionDismissed] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleValue, setEditingRoleValue] = useState('')

  /*
   * "A PAGE FLASHES FOR A SECOND AND THEN GOES TO THE CHECK-IN PAGE."
   *
   * The flashing page is this one's not-found state. `isLoading` is only true while a fetch is
   * actually in flight - a request that fails, or one that has not started yet, leaves `isLoading`
   * false with no data, and the render below falls straight through to GroundGone. React Query then
   * refetches on mount or focus, it succeeds, and the real page replaces it. From the outside that
   * is a strange screen appearing for about a second immediately after opening a check-in.
   *
   * `isError` is what separates the two states that were being treated as one: nothing here yet,
   * and definitely not there. Only the second is GroundGone.
   */
  const { data: ground, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  /*
   * A check-in that is genuinely gone answers 404. Anything else - a dropped connection, a token
   * being refreshed, a cold server - is a failure to load, and telling somebody their check-in does
   * not exist because their wifi blinked is the wrong sentence at the worst moment.
   */
  const definitelyGone = isError && (error as any)?.response?.status === 404

  /* THE CHECK-IN'S LIVE REPORT QUERY WENT WITH THE BODY THAT RENDERED IT. Each session's report
     is fetched by the page that shows it, from `/report/session/:n`, which is the only call that
     knows which session is being asked about. What this page still needs is whether a report
     exists at all - and `ground.report` already says that. */

  /* `activationStatus` and the report tab's session picker went with the report body. Each
     session's report is its own page now, and the mutual-reveal state is shown there, on the
     report it gates - not on a list of sessions. */


  /**
   * THE SESSIONS OF YOUR OWN THAT ARE FINISHED, newest first.
   *
   * Yours only. Somebody else's session is theirs until the shared report releases, which is the
   * same wall the session grid keeps - and the reason this reads `userId === user?.id` rather than
   * "everybody on the check-in".
   */
  const mySessions = ((ground as any)?.checkIns ?? [])
    .filter((c: any) => c.status === 'COMPLETED')
    .filter((c: any) => ((ground as any)?.participants ?? []).some((p: any) => p.id === c.participantId && p.userId === user?.id))
    .sort((a: any, b: any) => (b.sessionNumber ?? 0) - (a.sessionNumber ?? 0))

  /**
   * ONE ROW PER SESSION, AND WHO EACH ROW IS COUNTING.
   *
   * "It is just meant to show a list of sessions and then you click and get the report. And you
   * see who's checked in, the report is counting."
   *
   * The denominator is every party who is not managing-only, which is exactly the set
   * `recordRoundCompletion` counts on the server - so "3 of 4 answered" and whether the row says
   * Final cannot disagree. Somebody managing without giving an account is not in it, because they
   * were never going to answer.
   */
  const sessionRows: SessionRow[] = (() => {
    const parties = (((ground as any)?.participants ?? []) as any[]).filter((p) => !p.managingOnly)
    const checkIns = ((ground as any)?.checkIns ?? []) as any[]
    const numbers = [...new Set(checkIns.filter((c) => !c.isSetup).map((c) => c.sessionNumber as number))]
      .filter((n) => checkIns.some((c) => c.sessionNumber === n && c.status === 'COMPLETED'))
      .sort((a, b) => b - a)

    return numbers.map((n) => {
      const answeredIds = new Set(
        checkIns.filter((c) => c.sessionNumber === n && c.status === 'COMPLETED').map((c) => c.participantId),
      )
      const mine = checkIns.find(
        (c) => c.sessionNumber === n && c.status === 'COMPLETED'
          && parties.some((p) => p.id === c.participantId && p.userId === user?.id),
      )
      return {
        sessionNumber: n,
        myCheckInId: mine?.id ?? null,
        answered: parties.filter((p) => answeredIds.has(p.id)).length,
        total: parties.length,
        closed: (((ground as any)?.roundCompletions ?? []) as any[]).some((r) => r.roundNumber === n),
        waitingOn: parties.filter((p) => !answeredIds.has(p.id)).map((p) => personLabel(p)),
      }
    })
  })()

  const removeGround = useMutation({
    mutationFn: () => groundsApi.remove(id!),
    onSuccess: (res) => {
      toast.success(`“${res.label}” deleted.`)
      qc.invalidateQueries({ queryKey: ['grounds'] })
      navigate('/grounds')
    },
    /* The server's sentence, which names who has answered. Anything else it says is worth showing
       verbatim too - a delete that refuses without a reason is the thing this page is replacing. */
    onError: (e: any) => setDeleteError(
      e?.response?.data?.message ?? 'That could not be deleted. Nothing has changed.',
    ),
  })

  const releaseReport = useMutation({
    mutationFn: () => reportsApi.release(id!),
    onSuccess: () => {
      /* The ground too: the report query is gated on `ground.report`, so refreshing only the
         report would leave the gate shut and the new report unfetched. */
      qc.invalidateQueries({ queryKey: ['report', id] })
      qc.invalidateQueries({ queryKey: ['ground', id] })
    },
    onError: () => toast.error('The report was not released. Nobody has been sent anything — try again.'),
  })




  /**
   * WHO A CHECK-IN BELONGS TO.
   *
   * `CHECKIN_SELECT` returns `participantId` and nothing else about the person, so
   * anything that wants a name has to join through `ground.participants`. Both places
   * that needed one had guessed at `participantEmail` / `participantName`, fields the
   * payload has never carried, and both failed silently: one sorted by row id, the other
   * rendered "Nobody has checked in yet" over twelve completed sessions. W8-66.
   *
   * Falls back to the email's local part only when there is no linked user - which is a
   * participant who has not accepted yet, so there genuinely is no name to use.
   */
  /**
   * MY OWN OPEN CHECK-IN, if I am a party to this ground. W8-76.
   *
   * A check-in is per participant per session, so "the open one" only means anything once
   * it is narrowed to the person asking.
   */
  const myParticipantId = (ground?.participants ?? []).find((p: any) => p.userId === user?.id)?.id ?? null
  const myOpenCheckIn = myParticipantId
    ? ((ground?.checkIns ?? []) as any[])
        .filter((c) => c.participantId === myParticipantId && c.status !== 'COMPLETED')
        .sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))[0] ?? null
    : null
  const myOpenAvailableFrom = (myOpenCheckIn as any)?.availableFrom ?? null
  const myOpenOpensLater = !!myOpenAvailableFrom && new Date(myOpenAvailableFrom).getTime() > Date.now()

  /**
   * "HAFSAH · WAITING", LOWERCASE, IN THE ROSTER. W-UX-4.
   *
   * Seen on the running page at phone width: the "Who is in this" chips read "hafsah · waiting" and
   * "abubakar · waiting" beside "You" - email local-parts wearing the position of a name, so the
   * roster looked like a mix of people and login handles.
   *
   * This is the FOURTH place doing it, and there is a comment on the third one that already says
   * "the third place doing this". Four hand-written chains for one question is the whole shape of
   * the problem, so this one now defers to `personLabel` like the rest, and the address is a last
   * resort rather than the first fallback.
   */
  const nameOfParticipant = (participantId: string | null | undefined): string | null => {
    if (!participantId) return null
    const p: any = (ground?.participants ?? []).find((x: any) => x.id === participantId)
    if (!p) return null
    return personLabel(p)
  }

  /**
   * The start date on record, as an `<input type="date">` wants it - the first ten characters of
   * the ISO string, in UTC. Not `toLocaleDateString`, which would show a person west of UTC the
   * day before and then save it back.
   */
  const startsAtOnRecord = (ground as any)?.startsAt ? String((ground as any).startsAt).slice(0, 10) : ''

  const isInitiator = !!ground && user?.id === ground.initiatorId

  /**
   * WHO GETS THE ADMIN VIEW. Her decision: the lead of that ground, and org admins
   * for any ground. Nobody else, and refused out loud rather than half-working.
   *
   * It was open to EVERY org member, because the route is `RequireAuth` and
   * `grounds.get` resolves any ground in your organisation. So somebody who is not
   * in a ground at all could open its setup, its participant list and its nudges -
   * not by finding a hole, just by opening the URL. The controls inside were gated
   * on `isInitiator`; the page was not.
   *
   * This is the client half. The server still answers `grounds.get` for any org
   * member, which is right for the participant view and for the grounds list, so
   * the read itself is not the thing to close. What must not happen is this page
   * rendering for somebody it was not built for.
   */
  const isOrgAdmin = user?.role === 'ADMIN'
  const canRunThisGround = isInitiator || isOrgAdmin
  /**
   * AND WHETHER THEY ARE IN IT, WHICH IS A DIFFERENT QUESTION.
   *
   * A lead is almost always also a party to their own check-in, and until now reaching their own
   * record meant leaving for a second page that looks identical to this one. It was computed inline
   * further down for the roster; named here because the tab row asks it too.
   */
  const viewerIsAParty = (ground?.participants ?? []).some((p: any) => p.userId === user?.id)

  /**
   * A LEAD'S OWN RECORD, FETCHED ONLY WHEN THEY ARE IN THE CHECK-IN.
   *
   * Same endpoints the party view used. Gated on being a party so an admin looking at a check-in
   * they are not in does not ask for a record they do not have.
   */
  const { data: myRecord } = useQuery({
    queryKey: ['my-record', id],
    queryFn: () => groundsApi.getMyRecord(id!),
    enabled: !!id && viewerIsAParty,
    retry: false,
  })
  const { data: mySoloReport, refetch: refetchSoloReport } = useQuery({
    queryKey: ['my-solo-report', id],
    queryFn: () => groundsApi.getMySoloReport(id!),
    enabled: !!id && viewerIsAParty,
    retry: false,
  })
  const { data: mySpecificity } = useQuery({
    queryKey: ['my-specificity', id],
    queryFn: () => groundsApi.getMySpecificity(id!),
    enabled: !!id && viewerIsAParty,
    retry: false,
  })

  /**
   * ONE READING OF HOW MANY SESSIONS THIS GROUND HAS. W8-4.
   *
   * This page held two. The header derived it from the timeline and the rhythm
   * with `plannedSessionsFor`, and the context strength read
   * `sessionCounts.total ?? totalSessions ?? 1` off the payload - which is how a
   * ground could say "Session 2 of 6" at the top while the panel below planned
   * for one. Hafsah's call was that derived wins, so it is derived once, here,
   * and everything on the page reads this.
   */
  const plannedSessions = plannedSessionsFor(
    ground?.timelineDays,
    (ground as any)?.cadence,
    (ground as any)?.maxSessions ?? (ground as any)?.totalSessions,
  )
  // Sent with the ground, because the client cannot read an environment variable
  // and a screen that guesses whether a feature is on renders half of it.
  const contextEnabled = (ground as any)?.contextEnabled === true

  /**
   * THE SEAT COUNT COMES FROM THE SERVER, NOT FROM THIS PAGE'S OWN ARITHMETIC.
   *
   * This warning used to compare `ground.participants.length` - the people in THIS check-in -
   * against the ACCOUNT's plan seat cap, read from a hardcoded map. Two different populations:
   * a five-seat account could run a nine-party check-in and be told it was out of seats, or sit
   * at its real limit across four check-ins and be told nothing.
   *
   * `/billing/status` reports the count and the cap computed the one way, for free plans and paid
   * ones alike, so what this warns about is what the invite will actually refuse.
   */
  const { data: billingStatus } = useQuery({
    queryKey: ['billing-status'],
    queryFn: billingApi.status,
    staleTime: 60 * 1000,
  })

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['participant-requests', id],
    queryFn: () => participantRequestsApi.list(id!),
    enabled: !!id && isInitiator,
    retry: false,
  })

  const { data: shareCardData, isLoading: shareCardLoading } = useQuery({
    queryKey: ['contributor-code-share-card', shareCodeId],
    queryFn: () => billingApi.getContributorCodeShareCard(shareCodeId!),
    enabled: !!shareCodeId && shareCodeModalOpen,
    retry: false,
  })

  const approveRequest = useMutation({
    // The server already invites the person as part of approving the request
    // (participant-requests.controller.ts's update() calls grounds.addParticipant
    // itself on APPROVED) - a second client-side addParticipant call here was
    // redundant and, since the participant row now exists, hit the "unaccepted
    // invite" branch and silently re-sent a second invite email for the same
    // approval.
    mutationFn: (req: ParticipantRequest) => participantRequestsApi.update(id!, req.id, 'APPROVED'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['participant-requests', id] })
      qc.invalidateQueries({ queryKey: ['ground', id] })
      toast.success('Participant added')
    },
    /* See below: the server's own sentence, for the same reason. */
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not add participant.'),
  })

  const dismissRequest = useMutation({
    mutationFn: (reqId: string) => participantRequestsApi.update(id!, reqId, 'DISMISSED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['participant-requests', id] }),
    onError: () => toast.error('That request was not dismissed - it is still in the list. Try again.'),
  })

  const [confirmClosing, setConfirmClosing] = useState(false)
  const closingSession = useMutation({
    mutationFn: () => groundsApi.beginClosingSession(id!),
    onSuccess: (r) => {
      toast.success(`Closing session begun - ${r.participantsFlagged} ${r.participantsFlagged === 1 ? 'person' : 'people'} will do their final check-in.`)
      setConfirmClosing(false)
      qc.invalidateQueries({ queryKey: ['ground', id] })
    },
    onError: () => toast.error('The closing session did not open. Nothing has changed for anyone — try again.'),
  })

  const remind = useMutation({
    mutationFn: (checkInId: string) => conversationApi.remind(checkInId),
    onSuccess: () => toast.success('Reminder sent'),
    onError: () => toast.error('The reminder did not go out - nobody has been emailed. Try again.'),
  })

  const fixEmail = useMutation({
    mutationFn: ({ participantId, email }: { participantId: string; email: string }) =>
      participantsApi.updateEmail(participantId, email),
    onSuccess: () => {
      toast.success('Invite resent to the corrected address')
      setFixingEmailId(null); setFixingEmailValue('')
      qc.invalidateQueries({ queryKey: ['ground', id] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not update the email.'),
  })

  /**
   * "I never got the email."
   *
   * The endpoint to answer that has always existed and nothing called it, so the
   * only recovery was resending to the same address that already failed, or a
   * support request. This fetches the live link and puts it on the clipboard, so
   * the lead can pass it on by any channel they like.
   *
   * It does NOT mint a new link. Reading it leaves the one already sitting in
   * their inbox working, so a person who finds the original email later is not
   * met with a dead link.
   */
  /**
   * SENDING THE INVITE AGAIN, WHICH HAD NO BUTTON. W-UX-C.
   *
   * `POST /grounds/:id/participants/:pid/resend-invite` has existed since GW-24 and nothing ever
   * called it - one of the endpoints the audit found stranded. What the roster offered instead was
   * "Copy invite link", which makes the LEAD open their own mail client and paste, for the most
   * ordinary failure there is: somebody did not see the email.
   *
   * The server refuses once they have accepted or checked in, and issues a fresh 14-day token, so
   * this is a resend and not a second invite.
   */
  const resendInvite = useMutation({
    mutationFn: (participantId: string) => groundsApi.resendParticipantInvite(id!, participantId),
    onSuccess: () => toast.success('Invite sent again.'),
    onError: () => toast.error('It did not send again. The original invite still works — try again in a moment.'),
  })

  const copyInviteLink = useMutation({
    mutationFn: async (participantId: string) => {
      const { inviteUrl } = await groundsApi.getParticipantInviteUrl(id!, participantId)
      await navigator.clipboard.writeText(inviteUrl)
      return inviteUrl
    },
    onSuccess: () => toast.success('Invite link copied. It is the same link as their email - send it however you like.'),
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Could not get the invite link.'),
  })

  /**
   * And once they have accepted, the same problem with no answer. "Copy invite link" refuses from
   * that moment on, and the address of an open check-in existed only inside a scheduled email - so
   * a person who missed that email could not reach their own check-in and the lead could not send
   * it to them. This copies the link to the one that is open now. It mints nothing.
   */
  const copyCheckInLink = useMutation({
    mutationFn: async (participantId: string) => {
      const { checkInUrl } = await groundsApi.getParticipantCheckInUrl(id!, participantId)
      await navigator.clipboard.writeText(checkInUrl)
      return checkInUrl
    },
    onSuccess: () => toast.success('Check-in link copied. Send it however you like.'),
    /* The server's sentence, not ours: it knows whether they have no open check-in or have not
       accepted yet, and those need different things from the lead. */
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Could not get the check-in link.'),
  })

  const updateRole = useMutation({
    mutationFn: ({ participantId, role }: { participantId: string; role: string }) =>
      participantsApi.updateRole(participantId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ground', id] })
      setEditingRoleId(null)
      setEditingRoleValue('')
      toast.success('Role updated')
    },
    onError: () => toast.error('Their role did not change. Nothing else was altered — try again.'),
  })

  // Contact visibility toggle. restrict=true hides peers' emails from each other (default).
  /**
   * WHETHER THE PARTIES CAN SEE EACH OTHER AT ALL. W14-4.
   *
   * `PATCH /grounds/:id/peer-visibility` has been live and tested since the peer rule was
   * written, and **nothing in the product called it**. So the rule that decides whether a
   * participant knows who else is in their ground was set by a default nobody could see - hidden
   * on evaluation and cohort grounds, shown elsewhere - and no lead could change it.
   */
  const setPeerVisibility = useMutation({
    mutationFn: (visible: boolean) => groundsApi.setPeerVisibility(id!, visible),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ground', id] }); toast.success('Saved.') },
    onError: () => toast.error('Not saved. What you typed is still here — try again.'),
  })

  const setContactVisibility = useMutation({
    mutationFn: (restrict: boolean) => groundsApi.setExternalVisibility(id!, restrict),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ground', id] }),
    onError: () => toast.error('That setting did not change — try again.'),
  })


  /**
   * THE SHARED NOTE. Separate mutation from the private one on purpose: they differ in the single
   * most consequential way a piece of context can differ - who reads it - and a shared control with a
   * checkbox is how somebody publishes a private note by mistake. Different box, different button.
   */


  /**
   * PEOPLE LINED UP TO BE ADDED, EACH WITH THEIR OWN LINE ABOUT WHAT THEY ANSWER FOR.
   *
   * "You should be able to add many parties to the check-in at setup and add context about them."
   * The form took one address at a time and cleared itself, so a team of six was six rounds.
   *
   * Nothing is sent until the queue is invited: adding to the list is free and reversible, which is
   * the whole reason to have a list rather than firing an invitation per keystroke of enthusiasm.
   */
  const [queuedToAdd, setQueuedToAdd] = useState<{ email: string; note: string }[]>([])

  /**
   * SENT ONE AT A TIME, AND EVERY OUTCOME REPORTED.
   *
   * `addParticipant` is per-person on the server - it has the seat check, the approval rule and the
   * deferral in it - so this is a loop rather than a bulk endpoint, and each result is read: refused
   * ones name their reason and are written down, waiting ones are counted. The same rules the
   * conversation's save keeps, because "we added them but you heard nothing" is the bug that started
   * all of this.
   */
  const inviteTheQueue = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        queuedToAdd.map((q) =>
          groundsApi.addParticipant(id!, { email: q.email, note: q.note || undefined }),
        ),
      )
      const failed = results
        .map((r, i) => ({ r, email: queuedToAdd[i].email }))
        .filter((x): x is { r: PromiseRejectedResult; email: string } => x.r.status === 'rejected')
        .map(({ r, email }) => ({
          email,
          because: (r.reason as any)?.response?.data?.message ?? 'The invite did not send.',
        }))
      const added = results
        .filter((r): r is PromiseFulfilledResult<{ invitedAt?: string | null; notInvitedBecause?: string | null }> => r.status === 'fulfilled')
        .map((r) => r.value)
      const why = whyNotInvited(added)
      return { failed, why, sent: added.filter((a) => !!a?.invitedAt).length }
    },
    onSuccess: ({ failed, why, sent }) => {
      /* The ones that failed stay in the queue, so the retry is in place rather than retyped. */
      setQueuedToAdd(queuedToAdd.filter((q) => failed.some((f) => f.email === q.email)))
      qc.invalidateQueries({ queryKey: ['ground', id] })
      if (sent > 0) toast.success(`Invite sent to ${sent} ${sent === 1 ? 'person' : 'people'}`)
      for (const line of sentencesFor(why)) toast.info(line)
      for (const f of failed) toast.warning(`${f.email}: ${f.because}`)
      if (failed.length) rememberWhoWasNotInvited(id!, failed)
    },
    /*
     * THE SERVER'S OWN SENTENCE, WHICH THIS THREW AWAY UNTIL TWO GUARDS CAUGHT IT.
     *
     * Every reason adding somebody can be refused is written for a person and returned: the seat
     * limit, an address already on the check-in, the gate that refuses an invitation until
     * something has been said about what the check-in is for. "Could not add them. Try again."
     * replaces all of them with a loop the product knows they cannot leave.
     *
     * This handler only fires when the whole batch fails - a per-person refusal is reported by name
     * in onSuccess above - so it also says what became of the queue, which is the other half:
     * nobody was invited and the list is still there to try again with.
     */
    onError: (e: any) => {
      const said = e?.response?.data?.message
      const status = e?.response?.status
      toast.error(
        status >= 400 && status < 500 && typeof said === 'string' && said
          ? `${said} Nobody was invited - your list is still here.`
          : 'Could not add them, and nobody was invited. Your list is still here - try again.',
      )
    },
  })

  /* Many at once, one call each, so a refusal for one person (a seat, a guest) is reported for that person and the rest still land. */
  const [addingMany, setAddingMany] = useState(false)
  async function addManyParticipants(emails: string[]) {
    setAddingMany(true)
    let added = 0
    const refused: string[] = []
    const rows: { invitedAt?: string | null; notInvitedBecause?: string | null }[] = []
    for (const email of emails) {
      try {
        const r = (await groundsApi.addParticipant(id!, { email })) as { invitedAt?: string | null; notInvitedBecause?: string | null }
        added++
        rows.push(r)
      } catch (err: any) {
        refused.push(`${email}: ${err?.response?.data?.message ?? 'could not be added'}`)
      }
    }
    setAddingMany(false)
    qc.invalidateQueries({ queryKey: ['ground', id] })
    const invited = rows.filter((r) => !!r.invitedAt).length
    if (added) toast.success(added === 1 ? (invited ? 'Added and invited.' : 'Added.') : `${added} people added${invited ? `, ${invited} invited` : ''}.`)
    for (const line of sentencesFor(whyNotInvited(rows))) toast.info(line)
    for (const line of refused) toast.error(line)
  }

  const addParticipantMut = useMutation({
    mutationFn: () => groundsApi.addParticipant(id!, { email: newParticipantEmail.trim(), note: newParticipantNote.trim() || undefined, department: newParticipantDepartment.trim() || undefined }),
    onSuccess: (added) => {
      /*
       * "INVITE SENT" WAS SAID WHETHER OR NOT ONE WAS SENT.
       *
       * An invitation waits when the check-in starts in the future - the row is written with
       * `invitedAt: null` and no email goes, deliberately, because a mail that has already been read
       * cannot be recalled. The server returns `invitedAt` saying so, and this screen ignored it and
       * printed "Invite sent to ..." regardless.
       *
       * Reported as "all participants i added didnt get an email", with nothing anywhere on the
       * screen to explain why. The product was working as designed and lying about it, which is
       * worse than either.
       */
      setLastInviteWaits(!(added as { invitedAt?: string | null }).invitedAt)
      /* Three facts, three sentences. "Invited on the start date" was said for a person with no seat and
         for a mail that never sent - false in both. The mail that failed gets its own line, and the row's
         Resend button is the way back. */
      const because = (added as { notInvitedBecause?: string | null }).notInvitedBecause
      if (because === 'mail_failed') toast.error(`The invitation to ${newParticipantEmail.trim()} did not send. They are on the check-in; send it again from their row.`)
      /*
       * AND WHY IT WAITS, WHEN THE SERVER KNOWS A BETTER REASON THAN THE DATE.
       *
       * There are two reasons an invitation is held: the check-in starts in the future, or the
       * account has no seat for this person. This screen only knew the first, so somebody added
       * over the cap was told their invitation "goes out on the start date" - a date that has
       * nothing to do with it and may already have passed.
       *
       * The server sends the sentence when the reason is seats, because it is the side that knows
       * what the plan covers and who has to act. See added-but-waiting-for-a-seat.ts.
       */
      setWhyItWaits((added as { saying?: string }).saying ?? null)
      /*
        AND WHETHER THEY BELONG SOMEWHERE ELSE, WHICH NOBODY WAS TOLD.

        "She wasn't told that I was not part of her org when I was added." The join works - they get
        a guest membership and every org-scoped read still refuses them - so the person adding is
        the only one left in the dark, and they are the one who will wonder later why this person
        cannot see the rest of the workspace.
      */
      const guestFrom = (added as { guestFrom?: string }).guestFrom
      if (guestFrom) {
        toast.info(`${newParticipantEmail.trim()} is at ${guestFrom}, not here. They join this check-in as a guest and see nothing else in your workspace.`)
      }
      setLastInvitedEmail(newParticipantEmail.trim())
      setNewParticipantEmail('')
      setNewParticipantNote('')
      qc.invalidateQueries({ queryKey: ['ground', id] })
    },
    /**
     * THE SERVER'S OWN SENTENCE, WHICH THIS SCREEN WAS THROWING AWAY.
     *
     * Every reason adding somebody can be refused is written for a person and sent in the response:
     * the seat limit, an address already on the check-in, and the gate that refuses an invitation
     * until something has been said about what the check-in is for - which answers with the four
     * ways out of it, by name. This replaced all of them with "Could not add them."
     *
     * On the roster, of all screens: the setup flow already surfaces the per-person reason and the
     * report page already surfaces this one, so a lead adding somebody to a running check-in was
     * the only person in the product told nothing. The most likely refusal here is the gate, whose
     * entire purpose is to say what to do next.
     */
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not add them.'),
  })

  useEffect(() => {
    if (ground?.label) setGroundLabel(prev => prev || ground.label)
    // Seed the timeframe controls from what the ground actually is, so the form
    // opens showing the truth rather than a default that would silently change it.
    if (ground?.timelineDays) setTimelineDaysDraft(ground.timelineDays)
    if (ground?.cadence) setCadenceDraft(ground.cadence as GroundCadence)
    if (ground?.scenario) setGroundScenario(prev => prev || ground.scenario)
    /* Seeded from the record for the same reason as the two above: an empty date control on a
       check-in that HAS a start date would offer to clear it by pressing save. */
    setStartsAtDraft(startsAtOnRecord)
  }, [ground?.label, ground?.scenario, startsAtOnRecord])

  // Was the bare words "Ground not found." with nothing to press. W8-65.
  if (definitelyGone) return <Shell><GroundGone /></Shell>
  /*
   * "ABOUT TO BE RETRIED" RUNS OUT, AND THEN THE PAGE IS JUST LYING.
   *
   * This was `isLoading || !ground`, on the reasoning that anything which is not a 404 is "not here
   * yet, including a failed request about to be retried". That holds only while retries remain.
   * Driven in the browser with the check-in endpoint forced to 500, React Query tried twice, gave
   * up, and the page sat on "Loading…" indefinitely - telling somebody that work is still in
   * flight when it stopped seconds ago, with nothing to press and no way to find out.
   *
   * The list page already separates these two and says which happened; this is the same treatment.
   */
  if (isError && !definitelyGone) return (
    <Shell>
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em' }}>
          We could not load this check-in
        </div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, maxWidth: 340, margin: '0 auto 18px' }}>
          This is a connection problem, not a lost record. Nothing you have written is affected.
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          style={{ padding: '9px 18px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: isFetching ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}
        >{isFetching ? 'Trying…' : 'Try again'}</button>
      </div>
    </Shell>
  )

  if (isLoading) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div></Shell>
  /* Not loading and nothing came back: the address is wrong or this is not yours. "Loading…" forever said neither. */
  if (!ground) return (
    <Shell>
      <div style={{ padding: 24, maxWidth: 480 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No check-in at this address</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>The link may be out of date, or this check-in is not one you are in.</div>
        <button onClick={() => navigate('/grounds')} style={{ padding: '9px 14px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Back to your check-ins</button>
      </div>
    </Shell>
  )

  /**
   * REFUSED OUT LOUD, WITH SOMEWHERE TO GO.
   *
   * A blank page or a silent redirect both read as a bug. This says who the view is
   * for, and offers the view they DO have if they are a party to this ground -
   * because the most likely person to land here is a participant who followed a
   * link, and their own page is the one they wanted.
   */
  if (!canRunThisGround) {
    const amAParty = (ground.participants ?? []).some((p: any) => p.userId === user?.id)
    return (
      <Shell>
        <div style={{ maxWidth: 460, margin: '48px auto', padding: '0 20px' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 8 }}>
            This view is for whoever runs this check-in.
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--gw-sub)', lineHeight: 1.7, marginBottom: 18 }}>
            Setting up a check-in, inviting people and releasing the report belong to its lead, or to
            an admin in your organisation. {amAParty
              ? 'Your own check-ins and your record are on your page.'
              : 'You are not a participant in this check-in, so there is nothing here for you.'}
          </div>
          <button
            onClick={() => navigate(amAParty ? `/grounds/${id}/p` : '/grounds')}
            style={{ padding: '11px 18px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit' }}
          >
            {amAParty ? 'Go to my check-ins →' : 'Back to check-ins'}
          </button>
        </div>
      </Shell>
    )
  }

  /* Null while the check-in is live. See lib/a-ground-that-has-ended. */
  const ended = howItEnded(ground as any)

  /* There is no lead page (10 Sep 2026): a ground is open from the moment it is made, and the person
     leading it goes straight to their check-in like everybody else. */

  // The report's own read, or nothing at all. "{conf}/5 {band}" counted
  // completed check-ins and called the result "Aligned".
  const alignRead = alignmentLabel((ground as any).alignment)

  // Every party, every session - not "twelve distinct numbers are complete
  // somewhere". See everySessionDone: the short version closed a ground over a
  // missing closing account.
  const allSessionsDone = everySessionDone(ground.participants as any, ground.checkIns as any, plannedSessions)
  /**
   * The round EVERYONE has finished - the person furthest behind sets the pace.
   *
   * Counting the highest session anyone has done would say "Session 12 of 12"
   * while one party had only reached 4, which is the same optimism that let a
   * ground close over a missing account.
   */
  /**
   * ONE COPY OF THE RULE, AND IT IS NOT THIS FILE'S.
   *
   * This computed "the lowest number of sessions anybody has finished" inline. That is the same
   * rule `whichSessionIsThisCheckInOn` holds, so fixing the roster to agree with this counter would
   * have left two copies of one rule on one screen - which is how the roster and the counter came
   * to disagree in the first place.
   */
  const openRoundFromRule = whichSessionIsThisCheckInOn(
    (ground.participants ?? []).map((p: any) =>
      ((ground.checkIns ?? []) as any[])
        .filter((c) => c.participantId === p.id && c.status === 'COMPLETED')
        .map((c) => c.sessionNumber ?? 0),
    ),
  )
  const sessionsDone = openRoundFromRule - 1
  /**
   * HOW MANY SESSIONS *YOU* HAVE FINISHED, which is not the same number.
   *
   * `sessionsDone` is the round EVERYONE has finished - the person furthest behind sets the pace,
   * deliberately, because counting the highest anybody reached would say "Session 12 of 12" while
   * one party was on 4. That is the right number for the header, which is about the check-in.
   *
   * It was also being handed to `MyParticipation`, which prints it under "Sessions completed" in a
   * card whose other rows are "Your role" and your status. So finishing session 1 and then adding
   * two people - who have finished nothing - made your own card read "0 of 6". Seen on screen the
   * moment two people were invited: a session I had completed the night before, reported as not
   * done, on the panel that is explicitly about me.
   */
  /**
   * THE NUMBER EACH SETUP BAND GETS, COUNTED AS THE TAB IS DRAWN.
   *
   * Same reasoning as the Context page: several of these sections only render for an initiator, so
   * a hand-written number would leave gaps for everybody else - and a reader who sees 2 then 4
   * concludes something failed to load rather than that it was never theirs to see.
   */
  let setupBands = 0
  const setupBand = () => ++setupBands
  /* Counted once, and out here, so the row's own label does not have to reach into the record. */
  const settingsChangeCount = ((ground as any)?.settingsChanges?.length ?? 0) as number
  const foldProps = (n: number) => ({
    n,
    open: openSetupBand === n,
    onToggle: () => setOpenSetupBand((cur) => (cur === n ? -1 : n)),
    checked: setupChecked.includes(n),
    onCheck: () =>
      {
        const taking = setupChecked.includes(n)
        /* Shown at once, then reconciled with what the server says it holds. */
        setSetupCheckedLocal(taking ? setupChecked.filter(x => x !== n) : [...setupChecked, n].sort((a, b) => a - b))
        const call = taking ? forgetYouCheckedIt(id!, n) : rememberYouCheckedIt(id!, n)
        call.then(steps => setSetupCheckedLocal(steps)).catch(() => setSetupCheckedLocal(null))
      },
  })

  const mySessionsDone = ((ground?.checkIns ?? []) as any[]).filter(
    (c) => c.status === 'COMPLETED' && (ground?.participants ?? []).some((p: any) => p.id === c.participantId && p.userId === user?.id),
  ).length
  /* One dot per session of mine. The same read the party's page makes - the two views of a check-in
     have to move together, which is what the-two-views-are-a-pair protects. */
  const mySessionDots = ((ground?.checkIns ?? []) as any[])
    .filter((c) => (ground?.participants ?? []).some((p: any) => p.id === c.participantId && p.userId === user?.id))
    .sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))
    .map((c) => ({
      sessionNumber: c.sessionNumber ?? 0,
      state: (c.status === 'COMPLETED'
        ? (c.isSelfCorrection ? 'corrected' : 'done')
        : 'todo') as 'done' | 'corrected' | 'todo',
      /* `specificityHistory` is one score per finished session, in order, so the nth score belongs
         to the nth session. The bar is what she asked for back - "simple and visual" - and the
         session number under it is the thing the old one was missing. */
      checkable: ((mySpecificity?.scores ?? []) as number[])[(c.sessionNumber ?? 1) - 1] ?? null,
    }))
  /**
   * How many people have finished the round that is currently open. The round is
   * `sessionsDone + 1` - the one the header already names - so this and the
   * header cannot disagree about which round is being counted.
   */
  const openRound = sessionsDone + 1
  const roundDone = (ground.checkIns ?? []).filter(
    (c: any) => c.sessionNumber === openRound && c.status === 'COMPLETED',
  ).length
  /**
   * WHY THE SESSION NUMBER JUST WENT DOWN.
   *
   * Walked twice on a real check-in. Header read "Session 2 of 3, 0 of 1 checked in for session 2".
   * A person was invited. Nothing else happened. The header then read "Session 1 of 3, 2 of 3
   * checked in for session 1", and the second time somebody was added it went back again.
   *
   * The rule behind it is right and is stated in whichSessionIsThisCheckInOn: a round is open until
   * EVERYBODY has finished it, so it is one past the lowest number anybody has done. Adding somebody
   * who has done none puts the lowest back to zero.
   *
   * What is wrong is that a counter which only ever goes up is the one thing on the screen a person
   * reads as a position, so it going backwards reads as the product losing two people's work. It is
   * a fact about arithmetic that nobody can be expected to reconstruct, and it takes one sentence to
   * say. Shown only when it has actually happened: somebody here has finished more sessions than the
   * open round, which cannot be true unless the round moved back under them.
   */
  const roundWentBack = (ground.participants ?? []).some((p: any) =>
    (ground.checkIns ?? []).filter((c: any) => c.participantId === p.id && c.status === 'COMPLETED').length >= openRound,
  )
  /**
   * The report has three states worth telling apart, and only the last is good
   * news. "Waiting" is not a failure and does not get a warning colour - it is
   * the normal condition of a ground that is running.
   */
  /**
   * ONE PHRASE, AND IT SAYS THE WHOLE THING.
   *
   * This used to be a stat tile - a one-word `value` with a `caption` underneath carrying the actual
   * meaning. The tile moved into the header when Overview was cut, and a header has no room for a
   * caption, so the first version printed the bare word: a check-in with nothing generated read
   * "report ready", which sounds like "your report is waiting for you" and meant the opposite of
   * "generated, not released yet".
   *
   * So the phrase carries its own meaning. `caption` and `tone` are gone with the tile that read
   * them - a field nobody reads is a promise the shape does not keep.
   */
  /**
   * "READY" MEANT "A REPORT ROW EXISTS", WHICH IS NOT THE SAME THING.
   *
   * The API builds a forming picture as soon as anybody completes a session, so the row is there
   * long before the round is. This strip therefore read "report ready, not released" beside its own
   * "1 of 4 checked in", two facts in one line contradicting each other.
   *
   * NOW READ, NOT WORKED OUT. This counted the non-managing participants and compared them to the
   * COMPLETED check-ins at the open session number - which is the round-closing rule, implemented
   * on a screen. It gave the right answer and was still wrong to be here: the server did not know a
   * round had closed, so nothing server-side could act on it, and any second surface wanting the
   * same answer would have had to write the rule again and drift from this copy.
   *
   * The server records a round closing as a row and emits `round.completed`. This asks whether the
   * open round is among them. `roundDone` stays, because "1 of 4 checked in" is a count worth
   * printing and is not the same claim as "the round has closed".
   */
  const everyoneIn = ((ground as any).roundCompletions ?? []).some((r: any) => r.roundNumber === openRound)
  const reportState: string =
    (ground as any).report?.releasedAt
      ? 'report sent to everyone'
      : (ground as any).report
        ? (everyoneIn ? 'everyone is in, report on its way' : 'report being written')
        : 'no report yet'
  // contact-visibility toggle state (default: hidden). true = peers cannot see each other's email.
  /**
   * THE PEER RULE COMES FROM THE SERVER, NOT FROM A COPY OF IT HERE. W14-4.
   *
   * My first version listed the evaluative scenarios in this file and derived the default from
   * them - a second copy of a rule that lives in `familyFor()`, which would drift the first time
   * a scenario was added. `get()` now returns what it actually applied.
   */
  const peersVisible = (ground as any)?.peersVisibleEffective ?? true
  const peersDefaultHidden = (ground as any)?.peersDefaultVisible === false

  const contactHidden = ground.restrictExternalVisibility !== false

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--gw-bg)', borderBottom: '1px solid var(--gw-border)' }}>
        {/*
          ON A PHONE THIS HEADER BROKE INTO SEVEN LINES. W-UX-A.
          
          Her audit note: the title cuts off to "Ne...". What the running page actually did at 375px
          was worse - four things were competing for one row that could not hold any of them, so
          every one of them broke mid-word: "← Check-" / "ins", "Opened for:" / "Starting", "No read"
          / "yet". Two hundred and seventy pixels of chrome before a word of content.
          
          Nothing is hidden and nothing is truncated. The row is allowed to WRAP between its parts,
          and each part refuses to wrap inside itself, so it degrades into stacked whole phrases
          instead of shredded ones. `minWidth: 0` on the title block is what lets the long name take
          the space the short pieces give up.
        */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>← Check-ins</span>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>{ground.label}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {/*
                  "STARTING", ON A GROUND WITH TWELVE OF TWELVE SESSIONS DONE. W8-66.

                  This pill is the ground's MOMENT - what it was opened for - and the
                  moment for a new hire is genuinely STARTING for the ground's whole life.
                  But a small pill under the title, next to a green live dot, is where
                  every product on earth puts a status, so it reads as one, and on a
                  finished ground it reads as a lie.

                  Same word, labelled, so it cannot be mistaken for the state of the
                  ground. The state is the green dot beside it and the line under the
                  title, which were both already right.
                */}
                {/* The moment pill ('Opened for: Starting') went: the scenario pill on the next line says what kind of check-in this is, and an enum is not a sentence. */}
                {ground.status === 'ACTIVE' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gw-green-b)', display: 'inline-block' }} />}
                {/*
                  WHICH OF THE TWO VIEWS THIS IS, PERMANENTLY.
                  
                  One check-in has two pages - this one, which runs it, and the party page, which is
                  somebody's own account - and a button moves between them. Neither said which it was,
                  so anybody who crossed over had no way to tell why the screen had changed. It is a
                  standing label rather than a one-time announcement, because the confusion recurs
                  every time you come back.
                */}
                {/* Wraps. It was `nowrap` when the text was "running this check-in"; the longer
                    label that replaced it pushed a 375px page out to 403 and made the whole report
                    scroll sideways. Found by measuring the report on mobile, not by reading this. */}
                {/*
                  AND IT HAS TO BE TRUE OF WHOEVER IS READING IT.

                  This page serves two people: the lead, who runs the check-in, and an admin of the
                  organisation, who does not. It said "you are running this" to both - two inches
                  above a banner that reads "You are looking at this as an admin, not as its lead".
                  Seen on a real org's second admin: the header and the banner contradicting each
                  other on the same screen.

                  Both labels say the same thing about the view - it is everyone's state, not your
                  own account - and differ only on the half that is about the reader.
                */}
                {/* 'Everyone in it - you are running this' went too: the rail, the card and 'Led by' already say it. The admin variant stays, because that one is news. */}
                {!isInitiator && <span style={{ fontSize: 10, color: 'var(--gw-muted)' }}>Everyone in it - you are an admin here</span>}
              </div>
            </div>
          </div>
          {/*
            THE DOOR IS GONE, BECAUSE THERE IS NOWHERE IT NEEDED TO GO.

            This was "My check-ins", then "My own account", then "Just my own" - three names for a
            button whose job was to send a lead to a second page that looked identical to this one,
            because the things that were theirs lived only over there.

            They are here now: My record holds their record and their private report, and Setup
            holds their role and standing. A lead has no reason to leave, so the button that took
            them away is the last thing to remove rather than the next thing to rename.

            `/grounds/:id/p` is untouched and still serves a participant, who is sent there by
            `GroundPage`. What is gone is the SECOND door for somebody who was already on their own
            page - the thing that made two views of one check-in impossible to tell apart.
          */}
          {/*
            THE BOARD KEEPS ITS PAGE. WHAT IT LOSES IS ITS SECOND DOOR. W-UX-3.
            
            "Team board" was a pill up here AND a tab in the bar below, both going to the same
            place on the same screen. The audit counted the board as existing twice; it does not -
            it exists once with two entrances, which is worse, because a person who tries one and
            then the other cannot tell whether they have seen everything.
            
            The tab bar is the entrance, for the board and for every other part of a check-in. The
            board itself is untouched.
          */}
          {/*
            NOT ON THE TAB THAT ALREADY SAYS IT.
            
            "All 2 areas still open" was printed here AND as the report's own headline, and once the
            report moved into the tab they appeared on one screen, six centimetres apart. The report
            saying what it holds is the report doing its job; a header repeating it is a second copy
            of one fact, and a reader who spots both has to work out whether they mean the same thing.
            
            It stays on every other tab, where the report is not on screen to say it.
          */}
          {tab !== 'report' && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {alignRead
                ? <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', maxWidth: 160, lineHeight: 1.35 }}>{alignRead}</div>
                : <div style={{ fontSize: 11, color: 'var(--gw-sub)', whiteSpace: 'nowrap' }}>No report yet</div>}
            </div>
          )}
        </div>

        {/* Sessions are per-participant-per-session, so count DISTINCT session
            numbers, not check-in rows. */}
        {/*
          * THE ONE THING THAT NEEDS THEM, ABOVE THE THINGS THAT DO NOT.
          *
          * The row below is five facts - scenario, session, days left, who has answered, report
          * state - and each is worth having. None of them is "your turn". So the question a person
          * opens this page with was answered by inference across five items, four of which do not
          * change between visits.
          *
          * Same rule as the rail and the cards - `railAttention` - so three surfaces cannot give
          * three answers. Nothing is removed: the facts keep their line, and this sits above it only
          * when there is something to say.
          */}
        {(() => {
          const a = railAttention(ground as any, user?.id)
          const say =
            a.kind === 'overdue' ? { t: a.daysLate === 1 ? 'Your turn — 1 day late' : `Your turn — ${a.daysLate} days late`, c: 'var(--gw-amber-t)' }
            : a.kind === 'yours' ? { t: 'Your turn', c: 'var(--gw-navy)' }
            : a.kind === 'waiting' ? { t: `Waiting on ${a.total - a.done} of ${a.total}`, c: 'var(--gw-sub)' }
            : null
          return say
            ? <div style={{ padding: '0 16px 4px', fontSize: 14, fontWeight: 700, color: say.c, letterSpacing: '-.01em' }}>{say.t}</div>
            : null
        })()}
        <div style={{ display: 'flex', gap: 10, padding: '0 16px 10px', fontSize: 11, color: 'var(--gw-sub)', flexWrap: 'wrap', alignItems: 'center' }}>
          {ground.scenario && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-bg)', color: 'var(--gw-sub-d)' }}>
              {scenarioLabel(ground.scenario)}
            </span>
          )}
          {ground.resolutionState && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' }}>{ground.resolutionState}</span>
          )}
          {/* PROGRESS IS COUNTED IN SESSIONS, NOT DAYS.
              A ground eight sessions into twelve read "90 days remaining",
              which is arithmetically true - the calendar really had not moved -
              and useless, because the work is measured in check-ins. Sessions
              lead; the calendar follows in the quieter line, and only while it
              still has something to say. */}
          {/* WHAT ENDED IT COMES FIRST, and the session clock stops. See lib/a-ground-that-has-ended. */}
          {ended ? (
            <span style={{ fontWeight: 700, color: 'var(--gw-green-t)' }}>{ended}</span>
          ) : allSessionsDone ? (
            <span>every session done</span>
          ) : (
            <>
              {plannedSessions != null && (
                <span style={{ fontWeight: 700 }}>Session {Math.min(sessionsDone + 1, plannedSessions)} of {plannedSessions}</span>
              )}
              {ground.daysLeft != null && ground.daysLeft <= 3 ? (
                <span style={{ fontWeight: 700, color: 'var(--gw-red-t)' }}>{ground.daysLeft === 0 ? 'Due today' : `${ground.daysLeft} day${ground.daysLeft === 1 ? '' : 's'} remaining`}</span>
              ) : null}
              {/*
                THE STATE, IN THE PLACE THAT ALREADY HOLDS THE STATE. Overview's stat row moved here.
                
                Three numbers do not need a page. They needed to stop contradicting the header they
                sat under - "SESSIONS 1 of 6" and "THIS ROUND 0 of 1" beneath a header reading
                "Session 2 of 6" are all correct and read as three contradictions. On one line, in one
                order, with the session named once, there is nothing left to reconcile.
              */}
              {(ground.participants ?? []).length > 0 && (
                <span style={{ color: 'var(--gw-sub)' }}>
                  {/*
                    * THE ROUND IS NAMED, BECAUSE THE TWO NUMBERS ON THIS SCREEN COUNT DIFFERENT THINGS.
                    *
                    * This counts the OPEN round. The report panel below counts the one that just closed.
                    * Both are right, and together they read as a contradiction: "0 of 2 checked in" above
                    * "2 of 2 have checked in for this round", which is enough to make somebody doubt the
                    * record. Naming the session it counts costs three words and removes the question.
                    *
                    * SESSION, NOT ROUND. The first version of this said "Round 2 · 0 of 2 checked
                    * in", which introduced a third word for a thing that already had two. Her call,
                    * and the codebase agreed before she made it: "session" appears in 159 visible
                    * strings and "round" in 25. One word, and it is session.
                    */}
                  {roundDone} of {(ground.participants ?? []).length} checked in for session {openRound}
                </span>
              )}
              {roundWentBack && (
                <span style={{ color: 'var(--gw-muted)' }}>
                  back to session {openRound} because somebody new was added - a session stays open
                  until everybody has done it, and nothing anybody wrote is lost
                </span>
              )}
            </>
          )}
          {/* Report state only while there is something to say about it; 'report sent to everyone' beside 'Session 3 of 6' was a fourth fact for no reader. */}
          {reportState !== 'report sent to everyone' && reportState !== 'no report yet' && <span style={{ color: 'var(--gw-sub)' }}>{reportState}</span>}
        </div>

        {/* Tabs.
            THE BOARD BELONGS HERE, WITH THE OTHER PLACES YOU GO.
            It was a small dark pill floating up beside the ground's status and
            nowhere else in the product, so someone who did not happen to notice
            it on that one row had no way of knowing the board existed at all.
            Board is per-ground, so a global nav entry would have to guess which
            ground someone meant; this row is where a person already looks for
            the parts of a ground. It only appears when the server says this
            ground has one (boardRenders), same as before. */}
        {/**
          * ONE TAB ORDER, SHARED WITH THE PARTY VIEW. See `ground-tabs.ts`.
          *
          * This list used to live here, in its own order, with its own labels - and the party view
          * kept a second one. Report was fifth here and third there; "Sessions" here was "My record"
          * there. Both read the same function now, so a tab cannot move on one page without moving on
          * the other.
          *
          * The keys this page uses internally are unchanged, so nothing about its own state machine
          * moves: the shared list is mapped onto them.
          */}
        {/**
          * THE SAME ROW THE PARTY VIEW DRAWS. `GroundTabRow` owns the scroll behaviour, so the fix for
          * seven tabs in a 390px row lands on both views at once rather than being written twice.
          */}
        <GroundTabRow
          tabs={groundTabs({
            contextEnabled,
            canRunThisCheckIn: true,
            isAParty: viewerIsAParty,
          })}
          active={({ chat: 'chat', report: 'report', checkins: 'sessions', myrecord: 'record', docs: 'context', overview: 'overview', settings: 'settings' } as Record<string, string>)[tab] ?? 'chat'}
          onPick={k => {
            goTab(FROM_TAB_KEY[k] ?? 'chat')
          }}
        />
      </div>

      <div className="gw-bd" style={{ paddingTop: 12, maxWidth: 600, margin: '0 auto', width: '100%' }}>

        {/* OVERVIEW */}
        {/*
          THE PERSON WHO SET IT UP HAS TO KNOW WHAT IT IS WAITING FOR. W9-7.
          
          Holding the invites is right, and silently holding them is not: without this
          the creator sees a ground that looks finished, adds somebody, and gets a
          refusal with no explanation of who has to act.
        */}
        {(ground as any).status === 'AWAITING_APPROVAL' && (
          <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 10, padding: '13px 15px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 4 }}>
              Waiting for an admin to accept this check-in
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
              You can keep editing it, and nobody can be invited until it is accepted - so nobody
              has been contacted and nothing has been shared. An admin in your organisation sees it
              on their check-ins page.
            </div>
          </div>
        )}

        {/*
          AN ORG ADMIN LOOKING AT SOMEBODY ELSE'S GROUND. W8-32.
          
          Her note: "the org admin view should differ, today it is subtraction." The
          gate now decides WHO gets in - the lead of the ground, or an org admin - and
          for an admin who is not the lead the view was still identical to the lead's,
          including the two actions that cannot be undone.
          
          This ADDS the frame rather than removing controls. Hiding them is the
          subtraction she was describing, and it also removes the only oversight an
          admin has: an admin who cannot see that a report is sitting unreleased for
          three weeks cannot do anything about it. So they see everything, and they are
          told plainly whose ground it is and which decisions belong to that person.
        */}
        {isOrgAdmin && !isInitiator && (
          <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '12px 15px', marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 3 }}>
              You are looking at this as an admin, not as its lead
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--gw-navy)', lineHeight: 1.6 }}>
              {(() => {
                /**
                 * IT SAID "its lead runs this check-in." W8-66.
                 *
                 * Two bugs in one line, both visible the moment an org admin opened
                 * somebody else's ground:
                 *
                 * 1. It read `lead.email`, and `grounds.service.ts:872` NULLS the email
                 *    for a viewer who is neither the person nor the ground's lead - on
                 *    purpose. So for the only people who ever see this banner, the field
                 *    it depends on is always empty, and the fallback always fired.
                 * 2. The fallback was the lowercase fragment "its lead", which starts a
                 *    sentence, so the banner read "its lead runs this check-in." - a broken
                 *    template, on an admin's first look at a colleague's ground.
                 *
                 * The name is in the payload the whole time: `SAFE_PARTICIPANT_SELECT`
                 * pulls `user.firstName` precisely so somebody can be named when their
                 * email is hidden. Using the address to make a name was the W10-2 mistake
                 * anyway - "hafsah@meridian.test" is not what that person is called.
                 */
                const lead = (ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR')
                const first = (lead?.user?.firstName ?? '').trim()
                const who = first || 'The lead here'
                return `${who} runs this check-in. You can see everything here, which is the point of being an admin - but releasing the report and closing the check-in are theirs to decide, and nothing you do here is hidden from them.`
              })()}
            </div>
          </div>
        )}


        {/*
          WHO WAS NOT INVITED, said on the page the admin actually lands on.
          
          Adding people happens one call at a time, so a refusal for one of them — a seat limit, an
          address already on the check-in — was a toast on the wizard, which the admin is navigated
          away from a moment later. Their list of five became three and this page said nothing about
          it, so they left believing everybody had been asked. See who-was-not-invited.ts.
        */}
        {notInvited.length > 0 && (
          <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 6 }}>
              {whatToSayAboutThem(notInvited)}
            </div>
            <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
              {notInvited.map(f => (
                <li key={f.email}><span style={{ color: 'var(--gw-text)' }}>{f.email}</span> — {f.because}</li>
              ))}
            </ul>
            <button
              onClick={() => { thatIsDealtWith(id!); setNotInvited([]) }}
              style={{ fontSize: 12.5, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}
            >
              I have dealt with this
            </button>
          </div>
        )}

        {/* CHECK-INS */}
        {tab === 'chat' && (
          // The same component the participant view mounts, so there is one chat in the
          // product rather than a lead's version of one. A lead is not checking in here -
          // this is the ground's history, which is what they came to read.
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <GroundChat
              groundId={id!}
              /**
               * THE WAY TO CHECK IN CAME OFF THE PAGE, AND THE GATE CAUGHT IT. W8-76.
               *
               * I made Chat the landing tab and passed `openCheckInId={null}`, so a lead who
               * is also a party - the commonest kind - opened their ground and had no way to
               * start their own check-in from the tab they land on. suite_m failed on exactly
               * that: "the next-check-in affordance EXISTS on the ground page (hard - absence
               * is a failure, not a shrug)". It was right.
               *
               * WHY THE BUTTON HANDS OFF INSTEAD OF OPENING. Starting a check-in goes through
               * `probeSession`, which carries the paywall: a 403 becomes the free-extension /
               * access-code / subscribe modal. That lives on the participant page, and
               * copying it here would be a second copy of the payment path - the thing this
               * plan already records nearly losing once. So the button hands off with
               * `?open=1` and that page fires its own probe immediately: one click, one
               * implementation of the paywall.
               */
              openCheckInId={myOpenCheckIn && !myOpenOpensLater ? myOpenCheckIn.id : null}
              openSessionNumber={myOpenCheckIn && !myOpenOpensLater ? myOpenCheckIn.sessionNumber : null}
              totalSessions={plannedSessions ?? null}
              nextOpensAt={myOpenOpensLater ? myOpenAvailableFrom : null}
              /* Only the person who runs it can change the rhythm, so only they are told they can. */
              canChangeTheRhythm={true}
              onGoToSetup={() => goTab('settings' as Tab)}
              onOpenSession={() => navigate(`/grounds/${id}/p?open=1`)}
              openPending={false}
              /**
                * HER POINT, AND IT IS THE COMMON CASE: "what if sets themselves as
                * checkin in too, they need a chat".
                *
                * Step 6 of setup offers "I am a party. Let's begin." A lead who takes it
                * is a participant with their own check-ins, and they must get the real
                * conversation - not a read-only history of a ground they are in. So this
                * keys on whether they are actually a party, not on whether they are the
                * lead. Lead who is a party: the chat. Lead or org admin who is not: the
                * ground's history, because there is no transcript of theirs to show and
                * somebody else's is not theirs to read.
                */
              viewerIsParty={(ground.participants ?? []).some((p: any) => p.userId === user?.id)}
              /* The same roster the participant view now shows. W13-5. */
              /*
                PEERS ARE NOT HIDDEN FROM WHOEVER RUNS THE CHECK-IN.

                `peersVisibleEffective` is the rule between the PARTIES - on an evaluation-family
                ground they check in without seeing each other. Passed straight through, this view
                showed a lead or an org admin the party sentence: "Your lead knows who is here; you
                will not see the others or what they wrote, and they will not see you." Said to an
                admin, on a page that lists both parties by name and email on the very next tab, and
                whose own banner reads "You can see everything here, which is the point of being an
                admin". Found walking a second admin of a real organisation.

                The rule has not changed for anybody it applies to. This view is the one that runs
                the check-in, so it is not one of them.
              */
              peersHidden={(ground as any).peersVisibleEffective === false && !canRunThisGround}
              parties={(ground.participants ?? [])
                .filter((p: any) => !p.managingOnly)
                .map((p: any) => {
                  /**
                   * `plannedSessions` used to be the fallback here, which is the total rather than
                   * the position - on a six-session ground that made every roster read "waiting"
                   * forever. One answer for both pages now.
                   */
                  /**
                   * THE SESSION THE CHECK-IN IS ON, NOT THE ONE THIS READER IS ON.
                   *
                   * This passed `myOpenCheckIn` - the VIEWER's own open check-in - and then judged
                   * everybody's chip against it. A lead who had finished session 2 while nobody
                   * else had made the whole roster answer for session 1, so every chip read
                   * "checked in" directly above "0 of 2 checked in for session 2". Both were right
                   * and together they read as the product losing the record.
                   *
                   * `openRound` is the counter's own number. One session, named once.
                   */
                  const current = openRound
                  const theirs = ((ground.checkIns ?? []) as any[]).filter((c) => c.participantId === p.id)
                  return {
                    name: nameOfParticipant(p.id) ?? 'A participant',
                    done: hasDoneThisSession(theirs, current),
                    isSelf: p.userId === user?.id,
                  }
                })}
              history={[...(ground.checkIns ?? [])]
                .reduce((acc: any[], ci: any) => {
                  const n = ci.sessionNumber ?? 1
                  const row = acc.find(r => r.sessionNumber === n)
                  const who = nameOfParticipant(ci.participantId)
                  const done = ci.status === 'COMPLETED'
                  if (row) {
                    if (done && who && !row.people.includes(who)) row.people.push(who)
                    if (ci.completedAt && ci.completedAt > row.date) row.date = ci.completedAt
                  } else {
                    acc.push({ sessionNumber: n, date: ci.completedAt ?? ci.createdAt ?? '', people: done && who ? [who] : [] })
                  }
                  return acc
                }, [])
                .sort((a: any, b: any) => a.sessionNumber - b.sessionNumber)}
              brief={(ground as any).brief}
              signals={((ground as any).signals ?? [])
                .filter((sig: any) => sig.observationText)
                .map((sig: any) => ({
                  label: sig.code?.startsWith('D') ? 'Divergence' : 'Convergence',
                  text: sig.observationText,
                  session: sig.lastPeriodNumber ?? 1,
                }))}
            />
          </div>
        )}

        {/**
          * GATED ON BEING IN IT, NOT ONLY ON THE TAB BEING OFFERED.
          *
          * `groundTabs` leaves My record out for somebody who is not a party, so it is not in the
          * row. That hides the door; it does not lock it - `?tab=record` in the address bar reaches
          * this branch directly. An admin who is not in the check-in would have got two empty
          * panels about a record they do not have.
          *
          * No data was ever at risk: both reads are gated the same way, so they return nothing, and
          * the server refuses them independently. This is so the screen does not offer somebody a
          * page about themselves that cannot be about them.
          */}
        {tab === 'myrecord' && viewerIsAParty && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/*
              THE SAME SPLIT AS THE PARTY VIEW, AND THE SAME ORDER.
              
              Report is the whole check-in; My record is your part of it. Your private report is
              yours, so it sits here rather than above the shared report - which otherwise made that
              tab mean two things at once.
            */}
            {/* The summary first, then the reads of it. The two views move together. */}
            <WhatYouAreCarryingForward
              groundId={id!}
              mySoloReport={mySoloReport}
              refetchSoloReport={refetchSoloReport}
              otherParties={(ground.participants ?? [])
                .filter((p: any) => p.userId !== user?.id)
                .map((p: any) => ({ id: p.id, name: personLabel(p), email: p.email }))}
            />

            {/* The same cards the party's view opens My record with. */}
            <WhatYourRecordCanSupport
              strength={(myRecord as any)?.insightsLocked ? null : (myRecord as any)?.confidence}
              trend={mySpecificity?.trend}
              sessions={mySessionDots}
              totalSessions={plannedSessions ?? null}
              coverage={{
                iHaveCheckedIn: mySessionsDone > 0,
                answered: (ground as any)?.sessionProgress?.completed ?? mySessionsDone,
                parties: (ground as any)?.sessionProgress?.total
                  ?? (ground.participants ?? []).filter((p: any) => !p.managingOnly).length,
                /* The lead sees who is on their own check-in, so no fallback is needed here. */
                waitingOn: (ground.participants ?? [])
                  .filter((p: any) => !p.managingOnly && p.userId !== user?.id)
                  .filter((p: any) => !(((p as any).checkIns ?? []) as any[]).some((c) => c.status === 'COMPLETED'))
                  .map((p: any) => personLabel(p)),
                /* The lead's page does not fetch the shared report, and these two rows are about
                   what it can say. Left null, so they read as not-yet rather than as absent. */
                corroborated: null,
                documentBackedPct: null,
                roundsFinished: mySessionsDone,
              }}
              alsoNoticed={(myRecord as any)?.insightsLocked
                ? []
                : (((myRecord as any)?.patterns ?? []) as any[]).map((p) => p.text ?? p.observationText).filter(Boolean)}
            />
            <TheFiveThingsThatMakeItCheckable
              dimensions={(mySessions[0] as any)?.specificityDimensions ?? null}
              sessionNumber={(mySessions[0] as any)?.sessionNumber ?? null}
              mostUseful={(myRecord as any)?.insightsLocked ? null : mySpecificity?.mostUseful}
              strongest={(myRecord as any)?.insightsLocked ? null : mySpecificity?.strongest}
            />
            {/* MyPrivateReport is gone: the carry-forward moved to the top of the page, the session
                list to Report, and sign-off and the two signposts were removed - what was left was an
                empty grey box and a modal whose button had moved out from under it. */}
            <div style={{ borderTop: '1px solid var(--gw-border)', margin: '6px 0' }} />
            <MyRecord
            groundId={id}
            ground={ground}
            myRecord={myRecord}
            totalSessions={plannedSessions ?? null}
            completedCount={mySessionsDone}
            />
          </div>
        )}

        {tab === 'checkins' && (
          <div>
            {/* Who is overdue belongs with who has answered, and Remind is on the rows just below. */}
            {(ground.overdue ?? 0) > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '1px solid #C5D9EF', borderRadius: 8, padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
                <strong>{ground.overdue} {ground.overdue === 1 ? 'participant is' : 'participants are'} overdue.</strong> A missed session is not a lost session. Use Remind - the most common reason is the email went to spam. Their next check-in picks up where they left off.
              </div>
            )}

            {/*
              WHO IS IN IT, AND WHO HAS ANSWERED, ARE ONE QUESTION. Moved off Overview.
              
              This list sat on a tab of its own while the tab named Sessions listed the sessions -
              so finding out whether Ben had checked in meant reading one tab for the person and
              another for the session. Nothing here changed; it is on the tab where the question
              gets asked.
              
              Adding somebody and sharing the join link come with it, because they are the same
              job: deciding who gives an account of this.
            */}
            <div style={{ marginBottom: 16 }}>
              {(() => {
                const bounced = ground.participants.filter((p: any) => p.inviteDeliveryStatus === 'BOUNCED')
                if (bounced.length === 0) return null
                return (
                  <div style={{ background: 'var(--gw-red-bg)', border: '1px solid var(--gw-red-b-soft)', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12.5, color: 'var(--gw-red-t)', lineHeight: 1.5 }}>
                    <strong>{bounced.length === 1 ? '1 invite never arrived (bounced).' : `${bounced.length} invites never arrived (bounced).`}</strong> Fix the address below and resend - until then {bounced.length === 1 ? 'that person has' : 'those people have'} no way in.
                  </div>
                )
              })()}
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Participants</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ground.participants.map((p: any, i: number) => {
                  const myCheckIn = ground.checkIns?.find(c => c.participantId === p.id)
                  /**
                   * EVERY SESSION THIS PERSON HAS, NOT THE FIRST ONE FOUND.
                   *
                   * The row's dot came from `.find()` - one check-in per person - so somebody two
                   * sessions into six showed a single status and the row could not say which session
                   * it was about. That is why the tab needed a separate flat list of cards underneath
                   * repeating the same information a different way.
                   */
                  const theirSessions = [...(ground.checkIns ?? [])]
                    .filter((c: any) => c.participantId === p.id)
                    .sort((a: any, b: any) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))
                  const status = myCheckIn?.status ?? 'NOT_STARTED'
                  /**
                   * THE ROW'S STATE IS ALL THEIR SESSIONS, NOT WHICHEVER ONE `.find()` REACHED FIRST.
                   *
                   * Seen the moment the cells went in: a row read "Completed" beside a session-2 cell
                   * that had not started - both drawn from the same person, contradicting each other,
                   * because the label came from one arbitrary check-in and the cells from all of them.
                   * The label had been wrong on its own for as long as anybody had two sessions; it
                   * only became visible once something true stood next to it.
                   */
                  const allDone = theirSessions.length > 0 && theirSessions.every((c: any) => c.status === 'COMPLETED')
                  const anyGoing = theirSessions.some((c: any) => c.status === 'IN_PROGRESS')
                  const statusColor = allDone ? 'var(--gw-green-b)' : anyGoing ? 'var(--gw-amber-b)' : 'var(--gw-border)'
                  const statusLabel = allDone
                    ? 'Every session done'
                    : anyGoing
                      ? 'A session in progress'
                      : theirSessions.some((c: any) => c.status === 'COMPLETED')
                        ? 'Some sessions done, some still open'
                        : 'Not started'
                  const sharedReport = p.sharedSoloReport as Record<string, unknown> | null
                  return (
                    <div key={p.id}>
                      <div className="ga-participant-row">
                        <div className="ga-status-dot" style={{ background: statusColor }} title={statusLabel} />
                        <div className={`gw-av gw-av-${i % 6}`}>{(p.email || '?').charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          {/* `participantLabel` gives "a teammate" to anybody who has not signed
                              in yet, so a lead who invited three people saw three rows all called
                              "a teammate". This is the lead's own roster - they invited these
                              people by typing the addresses - so `personLabel`, which falls back
                              to the address, is both truthful and useful here. */}
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{personLabel(p)}</div>
                          {personLabel(p) !== p.email && (
                            <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{p.email}</div>
                          )}
                          {editingRoleId === p.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              <input
                                autoFocus
                                value={editingRoleValue}
                                onChange={e => setEditingRoleValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') updateRole.mutate({ participantId: p.id, role: editingRoleValue })
                                  if (e.key === 'Escape') { setEditingRoleId(null); setEditingRoleValue('') }
                                }}
                                style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--gw-border)', outline: 'none', fontFamily: 'inherit', width: 120 }}
                              />
                              <button onClick={() => updateRole.mutate({ participantId: p.id, role: editingRoleValue })} style={{ fontSize: 10, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
                              <button onClick={() => { setEditingRoleId(null); setEditingRoleValue('') }} style={{ fontSize: 10, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                              {p.roleAsDescribed && <span style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{p.roleAsDescribed}</span>}
                              {/* What someone is answerable for is the lead's to
                                  set, or their own. Every party could edit every
                                  other party's remit, on a ground that may be
                                  deciding whether they keep their job. */}
                              {(isInitiator || p.userId === user?.id) && (
                                <button
                                  onClick={() => { setEditingRoleId(p.id); setEditingRoleValue(p.roleAsDescribed ?? '') }}
                                  title="Edit role"
                                  style={{ fontSize: 10, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                                >✎</button>
                              )}
                            </div>
                          )}
                          {/* Says the same thing as the dot, and now it is true of every session. */}
                          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{statusLabel}</div>
                        </div>
                        {/* Chasing people is the lead's job. A peer nudging a peer
                            on an evaluation ground is a different act entirely. */}
                        {isInitiator && myCheckIn?.id && status !== 'COMPLETED' && p.userId && (
                          <button onClick={() => remind.mutate(myCheckIn.id)} style={{ fontSize: 11, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>Remind</button>
                        )}
                        {!p.userId && p.inviteDeliveryStatus === 'BOUNCED' ? (
                          <button
                            onClick={() => { setFixingEmailId(p.id); setFixingEmailValue(p.email) }}
                            style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-red-t)', background: 'var(--gw-red-bg)', border: '1px solid var(--gw-red-b-soft)', borderRadius: 12, padding: '2px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                            title="The invite email bounced - it never reached this address"
                          >
                            Email bounced - fix &amp; resend
                          </button>
                        ) : !p.userId && p.inviteDeliveryStatus === 'COMPLAINED' ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 12, padding: '2px 10px' }} title="They marked the invite as spam">Marked as spam</span>
                        ) : p.awaitingSeat ? (
                          /*
                            ON THE CHECK-IN, NOT WRITTEN TO.

                            Adding somebody when the account is full no longer refuses the lead -
                            the person is added and the invitation is held until an admin makes
                            room. Without a row saying so it reads as "Invite pending", which is a
                            lie in the direction that matters: the lead waits for a reply to a mail
                            that was never sent, and chases the person instead of the admin.
                          */
                          <button
                            onClick={() => navigate('/org/members')}
                            title="Your plan has no seat for them yet - an admin here has to make room"
                            style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 12, padding: '2px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Waiting for a seat
                          </button>
                        ) : !p.userId ? (
                          <span style={{ fontSize: 11, color: 'var(--gw-muted)' }} title={p.inviteDeliveryStatus === 'DELIVERED' ? 'Invite delivered to their inbox' : 'Invite sent'}>
                            {p.inviteDeliveryStatus === 'DELIVERED' ? 'Invite delivered' : 'Invite pending'}
                          </span>
                        ) : p.user?.awaitingOrgApproval ? (
                          /*
                            WAITING ON YOUR ORGANISATION, NOT ON THEM.

                            "You see pending org approval and not pending check-in." This row said
                            "Invite pending" for somebody whose invitation had gone out and who is
                            held by an admin in the lead's OWN organisation - so the lead reads it
                            as the person ignoring their email, and chases the wrong thing.

                            It goes where the approval is, because a lead can do nothing about it
                            from here and an admin can do it in two clicks.
                          */
                          <button
                            onClick={() => navigate('/org/members')}
                            title="An admin in your organisation has to let them in"
                            style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 12, padding: '2px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Waiting on your organisation
                          </button>
                        ) : null}
                        {/* Available for anyone who has not joined yet, whatever
                            the delivery status says - "delivered" only means the
                            mail server accepted it, not that a person saw it. */}
                        {isInitiator && !p.userId && (
                          <button
                            disabled={copyInviteLink.isPending}
                            onClick={() => copyInviteLink.mutate(p.id)}
                            style={{ fontSize: 11, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                            title="Copy their invite link so you can send it yourself"
                          >
                            {copyInviteLink.isPending && copyInviteLink.variables === p.id ? 'Copying...' : 'Copy invite link'}
                          </button>
                        )}
                        {/* Once they have accepted, every action above goes quiet - each one is
                            gated on not having joined. This is the row's only action from that
                            point, and it answers the same question: they cannot find it, send it
                            to them. */}
                        {isInitiator && p.userId && (
                          <button
                            disabled={copyCheckInLink.isPending}
                            onClick={() => copyCheckInLink.mutate(p.id)}
                            style={{ fontSize: 11, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                            title="Copy the link to their open check-in so you can send it yourself"
                          >
                            {copyCheckInLink.isPending && copyCheckInLink.variables === p.id ? 'Copying...' : 'Copy check-in link'}
                          </button>
                        )}
                        {/*
                          The plainer action, and the one a lead reaches for first: send it again.
                          Sits before "Copy invite link" in importance but after it in the row, so
                          the existing habit is not moved out from under anybody.
                        */}
                        {isInitiator && !p.userId && (
                          <button
                            disabled={resendInvite.isPending}
                            onClick={() => resendInvite.mutate(p.id)}
                            style={{ fontSize: 11, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                            title="Send the invite email again, with a fresh link"
                          >
                            {resendInvite.isPending && resendInvite.variables === p.id ? 'Sending...' : 'Resend invite'}
                          </button>
                        )}
                      </div>
                      {/*
                        ONE ROW PER PERSON, A CELL PER SESSION. The grid this tab was meant to be.
                        
                        Who is in it and who has answered were two lists on one tab: a roster with a
                        single status dot, and a flat run of session cards below it. Neither could
                        answer "where has each person got to" - the roster because it showed one
                        session, the cards because they were sorted by session and not by person.
                        
                        The cell is the answer: green done, amber in progress, hollow not started, and
                        your own open session is the one you can click.
                      */}
                      {theirSessions.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, marginLeft: 40, flexWrap: 'wrap' }}>
                          {/* Two bare numerals sat under a person's name with the meaning in a tooltip nobody hovers.
   The row says what it is. */}
                          <span style={{ fontSize: 10, color: 'var(--gw-muted)', marginRight: 6, letterSpacing: '.04em', textTransform: 'uppercase' }}>sessions</span>
                          {theirSessions.map((ci: any) => {
                            const done = ci.status === 'COMPLETED'
                            const going = ci.status === 'IN_PROGRESS'
                            /*
                             * YOUR OWN FINISHED SESSION IS WHERE YOUR REPORT IS, AND IT WAS THE ONE
                             * CELL YOU COULD NOT CLICK.
                             *
                             * `&& !done` made a completed session of your own unclickable, so the
                             * private report you read the moment you finished had no way back to it:
                             * "I cannot find the report that popped up after I was done with my
                             * first check-in, once it closes I have no idea where it went."
                             *
                             * It is not in the Report tab and never was - that tab holds the SHARED
                             * report, which does not exist until everyone has checked in. The
                             * private one lives on the session itself, and /checkin/:id renders it
                             * for a completed check-in already. Nothing linked there.
                             *
                             * Somebody else's session stays unclickable, done or not. That is the
                             * wall, and it is the reason this condition existed at all.
                             */
                            const isMine = p.userId === user?.id
                            return (
                              <button
                                key={ci.id}
                                disabled={!isMine}
                                onClick={isMine ? () => navigate(`/checkin/${ci.id}`, {
                                  state: { sessionNumber: ci.sessionNumber, isFinal: ci.isFinal ?? false, groundLabel: ground.label, groundId: id, isInitiator: isInitiator },
                                }) : undefined}
                                title={`Session ${ci.sessionNumber}: ${done ? `completed${ci.completedAt ? ' ' + new Date(ci.completedAt).toLocaleDateString() : ''}` : going ? 'in progress' : 'not started'}${isMine ? (done ? ' - yours, open it to read your report' : ' - yours, open it') : ''}`}
                                style={{
                                  fontSize: 10.5, fontWeight: 700, fontFamily: 'inherit', minWidth: 22,
                                  padding: '2px 6px', borderRadius: 4, cursor: isMine ? 'pointer' : 'default',
                                  border: `1px solid ${done ? 'var(--gw-green-b)' : going ? 'var(--gw-amber-b)' : 'var(--gw-border)'}`,
                                  background: done ? 'var(--gw-green-bg)' : going ? 'var(--gw-amber-bg)' : 'white',
                                  color: done ? 'var(--gw-green-t)' : going ? 'var(--gw-amber-t)' : 'var(--gw-muted)',
                                }}
                              >
                                {ci.sessionNumber}
                              </button>
                            )
                          })}
                          {/*
                            WHAT IS EXPECTED OF THEM, AS A STATE. One line, three answers, and the
                            words themselves live on Context where everyone reads them - a target is
                            not set on any tab any more, it comes out of the lead's own conversation.
                            
                            "Seen" is the one that matters: being measured against something you have
                            never laid eyes on is a different problem from disagreeing with it.
                          */}
                          {/*
                            THE STATE HERE, THE WORDS ON CONTEXT. A row says whether anything is
                            expected of this person and whether they have laid eyes on it; the
                            expectation itself is published where everyone reads it, which is the
                            point of publishing it at all. So the state is a link to the words rather
                            than a summary of them.
                          */}
                          <button
                            onClick={() => setTab('docs')}
                            title="Read the expectations, on the Context tab"
                            style={{ fontSize: 10.5, color: 'var(--gw-muted)', marginLeft: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline dotted' }}
                          >
                            {/* Read on the Sessions tab, directly under "Some sessions done, some still
                                open": "nothing expected of them yet". Two facts about two different
                                things, and the second did not say which thing. It is about the
                                EXPECTATION, so it says so. */}
                            {!p.objective?.text?.trim()
                              ? 'no expectation set for them yet'
                              : p.objective.seenBySubject
                                ? 'expectation set, they have seen it'
                                : 'expectation set, not seen yet'}
                          </button>
                        </div>
                      )}
                      {fixingEmailId === p.id && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 40 }}>
                          <input
                            autoFocus
                            type="email"
                            value={fixingEmailValue}
                            onChange={e => setFixingEmailValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && fixingEmailValue.includes('@')) fixEmail.mutate({ participantId: p.id, email: fixingEmailValue }) }}
                            placeholder="corrected@email.com"
                            style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--gw-red-b-soft)', outline: 'none', fontFamily: 'inherit', width: 240 }}
                          />
                          <button
                            disabled={fixEmail.isPending || !fixingEmailValue.includes('@')}
                            onClick={() => fixEmail.mutate({ participantId: p.id, email: fixingEmailValue })}
                            style={{ fontSize: 12, fontWeight: 700, color: 'white', background: 'var(--gw-red-t)', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', opacity: fixEmail.isPending ? 0.6 : 1 }}
                          >
                            {fixEmail.isPending ? 'Resending...' : 'Resend invite'}
                          </button>
                          <button onClick={() => { setFixingEmailId(null); setFixingEmailValue('') }} style={{ fontSize: 12, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      )}
                      {sharedReport && (
                        <div style={{ background: 'var(--gw-dark)', color: 'white', borderRadius: 8, padding: '12px 14px', marginTop: 4, marginLeft: 40 }}>
                          <Sec title={`${personLabel(p)}'s private report (shared by them)`} on="dark" />
                          {/* The same walk the participant's own page does. One component now, so the
                              report cannot read differently depending on who is looking at it. */}
                          <SoloReportBody report={sharedReport as Record<string, unknown>} dense />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/*
              WHAT THIS SAID WAS NOT TRUE, AND THE PAGE ALREADY SAID THE REST OF IT.
              "We should have a forming report, why do you have this here, we address this a
              million times." The line claimed the shared report generates once all accounts are
              in. It does not: the synthesis runs as soon as ANYBODY checks in and the report
              forms progressively - it is only RELEASED when everyone is through. So the product's
              own best feature was being denied on the page where a lead waits. The count it
              carried is in the header two lines up ("1 of 3 checked in for session 1").
              What is left is the one thing this spot can usefully do: get to the report.
            */}
            {(() => {
              const pending = ground.participants.filter((p: any) => {
                const ci = ground.checkIns?.find((c: any) => c.participantId === p.id)
                return !ci || ci.status !== 'COMPLETED'
              })
              if (pending.length === 0) return null
              return (
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '9px 12px', marginBottom: 16, lineHeight: 1.55, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <span>
                    The picture builds as each person answers - you can read what it has so far.
                    It is only released to everybody once all {ground.participants.length} are in.
                  </span>
                  <button
                    onClick={() => setTab('report')}
                    style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', flexShrink: 0 }}
                  >
                    Read it so far
                  </button>
                </div>
              )
            })()}

            {/*
              THE FREE EXTRA SESSION, ON THE TAB ABOUT SESSIONS.
              It was on the report tab, which is where somebody goes to READ - so an offer to add
              a session to the run appeared underneath a report. It belongs beside the run itself.
            */}
            {/*
              THE CONDITION CAME ACROSS UNCHANGED, and it has to. I moved this panel with a made-up
              gate - `ground.freeExtensionAvailable`, which is not a field - and a wrong path for
              `freeExtensionUsed`. The real one is four facts: the round has reported, this is not
              a free check-in, the organisation has no active subscription, and the balance is zero.
              Any one of them wrong shows a paywall to somebody who has already paid.
            */}
            {ground.status === 'REPORT_READY' && !postSessionDismissed &&
              !ground.isFreeGround &&
              !(ground.org?.subscriptionPlan && ground.org?.subscriptionStatus === 'active') &&
              (ground.sessionsBalance ?? 0) === 0 && (
                <div style={{ marginBottom: 16 }}>
                  <PostSessionPanel
                    groundId={ground.id}
                    freeExtensionUsed={ground.org?.freeExtensionUsed ?? false}
                    onDismiss={() => setPostSessionDismissed(true)}
                  />
                </div>
              )
            }

            {pendingRequests.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gw-amber-b)', flexShrink: 0, display: 'inline-block' }} />
                  Pending participant requests ({pendingRequests.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingRequests.map(req => (
                    <div key={req.id} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '13px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>
                        {req.requestedName ? `${req.requestedName} (${req.requestedEmail})` : req.requestedEmail}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 8 }}>Requested by {req.requestedByEmail}</div>
                      <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.55, marginBottom: 12 }}>{req.reason}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => approveRequest.mutate(req)}
                          disabled={approveRequest.isPending}
                          style={{ flex: 1, padding: '8px 12px', borderRadius: 7, background: 'var(--gw-dark)', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: approveRequest.isPending ? 0.6 : 1 }}
                        >
                          Add participant
                        </button>
                        <button
                          onClick={() => dismissRequest.mutate(req.id)}
                          disabled={dismissRequest.isPending}
                          style={{ padding: '8px 14px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', fontSize: 12, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit', opacity: dismissRequest.isPending ? 0.6 : 1 }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/*
              WHAT IS LEFT HERE IS THE CLOSING SESSION, WHICH IS ABOUT SESSIONS.

              This was the "Add contributor" block: a seat-limit notice, an add-a-person button, the
              add form, an "invite another" confirmation and the closing-session control, all in one
              container on the tab about how the run is going. Adding people moved to Setup band 1,
              beside the access code and the broadcast link, because all three answer one question -
              how somebody gets into this check-in. The form went with the button rather than being
              left behind: nothing here could open it any more, and an unreachable form is worse
              than a missing one because it still has to be maintained.

              The seat notice went with them. It is a fact about adding somebody, and it belongs
              where somebody is added - which is also where it can be said BEFORE an address is
              typed rather than after the button is pressed.
            */}
            {isInitiator && !['RESOLVED', 'CLOSED', 'STALLED', 'AWAITING_LEAD'].includes(ground.status) && (
              <div style={{ marginTop: 20 }}>
                {confirmClosing ? (
                  <div style={{ border: '1px solid var(--gw-amber-b-soft)', background: 'var(--gw-amber-bg)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 4 }}>Begin the closing session?</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', lineHeight: 1.5, marginBottom: 10 }}>
                      Everyone's next check-in becomes their final one - same conversation, marked as closing. The final report reads the whole record, then you and the others agree the end state.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => closingSession.mutate()} disabled={closingSession.isPending} style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--gw-amber-t)', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Begin closing session</button>
                      <button onClick={() => setConfirmClosing(false)} style={{ padding: '8px 14px', borderRadius: 7, background: 'none', color: 'var(--gw-amber-t)', border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmClosing(true)} style={{ width: '100%', padding: '11px 16px', borderRadius: 8, background: 'none', color: 'var(--gw-amber-t)', fontSize: 13, fontWeight: 600, border: '1px dashed var(--gw-amber-b-soft)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Begin the closing session →
                  </button>
                )}
              </div>
            )}

            {/*
              THE BROADCAST LINK AND ITS QR CODE MOVED TO SETUP, beside the access code and the
              add-a-person control - all three answer one question, which is how somebody gets into
              this check-in. On this tab they sat under the session grid, which is about how the run
              is going. Both locks come with them: the server withholds the token from
              non-initiators and the render is gated on `isInitiator`, so neither change alone can
              put a shareable link to somebody's record on a participant's page.
            */}

            {/*
              NO TAB SETS A TARGET. The four editing panels that stood here are gone.
              
              They were the old model: the lead PROPOSES a target, the person ACCEPTS it or writes
              their own. That model is replaced - an expectation is stated in the lead's own check-in,
              published to Context in plain view, and refined only through the chat where a change is
              probed and lands on the record with its reason.
              
              Her decision, in her words: "Participants should not be able to rewrite their targets or
              accept it. One person is doing this, we dont want chaos. But they can see it."
              
              What survives here is the STATE, on each person's row above: set, seen, or nothing yet -
              and it opens Context, where the words are.
            */}

            {/*
              THE GLANCE ROW, from the board's own components.
              This tab is now the first thing anybody sees about a ground, and it
              was a bare list of session rows - true, but it answered "what
              happened" without answering "where does this stand". The board has
              solved that problem already, so this uses the same Stat tile rather
              than inventing a third way of showing a number.
            */}
            {/*
              THE THREE TILES ARE GONE, AND NOTHING WAS LOST.
              
              "This round", "Checked in" and "Still to come" were three readings of one thing, and the
              page header already says it in one line: Session n of m, x of y checked in. Four copies
              of the same arithmetic on one screen is how "1 of 6" and "0 of 1" came to sit under a
              header reading "Session 2 of 6" - every number correct, and together unreadable.
              
              The grid above answers the question the tiles were reaching for, per person.
            */}
            {/*
              THE FLAT LIST OF CARDS IS GONE. It ran one card per check-in, sorted by session, so a
              tab called Sessions answered "which sessions exist" and never "where has each person got
              to" - and on two parties across twelve sessions it was twenty-four cards reading Session
              1, Session 1, Session 2, Session 2. The cells on each person's row carry the same status,
              the same date in their tooltip, and the same click into your own open session.
            */}
            {(ground.checkIns ?? []).length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, padding: '14px 16px', background: 'var(--gw-bg)', borderRadius: 8, border: '1px solid var(--gw-border)' }}>
                No sessions yet. The first one opens once the people above have been invited and the
                check-in starts.
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS */}
        {/*
          ONE CONTEXT PAGE, RENDERED BY BOTH VIEWS. This tab used to be assembled inline here for the
          lead, and separately inline in GroundParticipantPage for everybody else - two places that
          had to agree, each fine on its own, nothing reconciling them. They drifted into different
          band orders for the same tab, a stray heading in one of them, and a button pointing at a
          chat the other page does not have. See ContextPage for the order and why it is that order.
        */}
        {/*
          THE LEAD AND AN ADMIN ARE NOT THE SAME READER HERE.

          This passed 'lead' for both, so an org admin got the lead's private steers - the band
          headed "Only you see this", notes promised never to be quoted - along with the lead's
          running log, standing note and context conversation. See the note on ContextPage's
          `role`. The brief stays rewritable for both, because that is the shared description of
          the work rather than one person's framing.
        */}
        {tab === 'docs' && (
          <ContextPage
            ground={ground}
            role={isInitiator ? 'lead' : canRunThisGround ? 'admin' : 'party'}
            viewerUserId={user?.id}
          />
        )}

        {/* REPORT */}
        {/*
          THE REPORT TAB IS A LIST OF SESSIONS, AND NOTHING ELSE.

          "The report page is annoying and carries too much - it is just meant to show a list of
          sessions and then you click and get the report. And you see who's checked in, the report
          is counting."

          What used to be here, all at once: the board, a release control with its own
          confirmation, the forming report's entire body, an alignment read with two competing
          empty states, "how this report is put together", a resolution strip, a correction
          paragraph, a list of your own sessions, and the round history. Nine things on the screen
          somebody opens to read one report.

          All of it still exists. Each session's report - your own account and what the accounts
          together show - is on that session's own page, which is where a report belongs. The whole
          run in one place is the board's job, and the board is the first row here.
        */}
        {tab === 'report' && (
          <div>
            <TheReportIsAListOfSessions
              rows={sessionRows}
              boardRenders={!!(ground as any).boardRenders}
              onOpenBoard={() => navigate(`/grounds/${ground.id}/board`)}
              onOpenSession={(n: number) => navigate(`/grounds/${ground.id}/session/${n}`)}
            />

            {/*
              RELEASING, AS ONE LINE RATHER THAN THE HEADLINE ACTION.

              "Not sure what release report is for." Fair - in the normal path nobody presses it.
              It fires by itself the moment the last person finishes: everybody is emailed, the
              report is stamped released, and each person's follow-up guide is written. The button
              exists only to cut a round short and publish what there is, so it says that, and it
              only appears while a round is genuinely open.
            */}
            {isInitiator && (ground as any).report && !(ground as any).report.releasedAt && (
              <div style={{ marginTop: 14, border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                  When the last person answers, the report goes out to everybody on its own - you do
                  not have to do anything. If you need to stop waiting, you can close this round now
                  and publish what there is; it will be missing whoever has not answered.
                </div>
                {!showReleaseConfirm ? (
                  <button
                    onClick={() => setShowReleaseConfirm(true)}
                    style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                  >
                    Close this round now and publish what there is
                  </button>
                ) : (
                  <div style={{ marginTop: 10, background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 8, padding: '11px 13px' }}>
                    <div style={{ fontSize: 12.5, color: 'var(--gw-amber-t)', lineHeight: 1.6, marginBottom: 10 }}>
                      {/* "Everybody reads the same thing at the same moment" was here and is not
                          true: everyone is emailed, but each person has to show theirs before they
                          can read it, and the lead does not. A false reassurance in the
                          confirmation for something that cannot be undone. */}
                      Everybody is emailed. This cannot be undone, and
                      anybody who has not answered loses their turn on this round.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => releaseReport.mutate()}
                        disabled={releaseReport.isPending}
                        style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: releaseReport.isPending ? 0.6 : 1 }}
                      >
                        {releaseReport.isPending ? 'Publishing…' : 'Publish it now'}
                      </button>
                      <button
                        onClick={() => setShowReleaseConfirm(false)}
                        style={{ padding: '8px 14px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', fontSize: 12.5, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Keep waiting
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/*
            * ADDING SOMEBODY TO THE CHECK-IN, ON THE SCREEN CALLED SETUP.
            *
            * Reported plainly: "the setup page has no way for me to add another party to the
            * check-in." It did not. The control existed on the Sessions tab, beside the roster,
            * which is where somebody goes to see how a run is going rather than to change who is in
            * it - and Setup held the timeline, the cadence, the name, the visibility and how to
            * close the whole thing, but not the one setting people look for first.
            *
            * MY OWN LINK POINTED HERE, which is how it got worse. Two turns ago the check-in
            * conversation gained an "Add people" link straight to this tab, on the grounds that a
            * tab nobody is told about is a tab nobody uses. It sent people to a screen without the
            * control. A link to the wrong place teaches somebody the product cannot do the thing.
            *
            * Same control, same mutation as the Sessions tab: this is one queue with two entrances,
            * not a second way of adding anybody.
            */}
          {/*
            * THE SETUP TAB WAS EIGHT LOOSE FIELDS WITH NOTHING GROUPING THEM.
            *
            * "The setup page should get the same treatment you just gave the context page." It was
            * add-a-person, then a card about you, then who-works-together, then a timeframe, then a
            * name, then a scenario, then two privacy toggles, then closing and an access code - each
            * one a bare label, all the same weight, in the order they happened to be built.
            *
            * The questions themselves fall into four: who is in it, how it runs, what it is, and how
            * it ends. Nothing moved; they are named and numbered, which is the difference between a
            * form and a settings page.
            */}
          {isInitiator && (
            <>
            <Fold {...foldProps(setupBand())} title="Who is in it" src="adding somebody sends them an invitation" summary={`${(ground.participants ?? []).length} on this check-in`}>
            <div className="gw-card" style={{ padding: '14px 16px' }}>
              {/*
                THE SEAT LIMIT, SAID BEFORE AN ADDRESS IS TYPED RATHER THAN AFTER.

                It came across with the add-a-person control from the Sessions tab, and this is the
                better place for it in a way that matters: on that tab it sat above a button, and
                the refusal itself still arrives from the server after somebody has typed a
                colleague's address and pressed add. Said here, it is read before the typing.

                The count includes the person reading it, which is why that is said out loud -
                "5 people" reads as "5 I can invite" and it is not.
              */}
              {(() => {
                const seats = billingStatus?.people
                const cap = seats?.cap
                if (cap == null || seats?.count == null || seats.count < cap) return null
                return (
                  <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 8, padding: '10px 13px', marginBottom: 10, fontSize: 12, color: 'var(--gw-amber-t)', lineHeight: 1.55 }}>
                    Your plan covers {cap} people, including you, and all {cap} are taken. Move to a larger plan to add more.
                    <button onClick={() => navigate('/billing')} style={{ display: 'inline', marginLeft: 8, background: 'none', border: 'none', fontSize: 12, color: 'var(--gw-amber-t)', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                      View plans
                    </button>
                  </div>
                )
              })()}
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Add a person to this check-in</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 10, lineHeight: 1.5 }}>
                They give their own version of the same work. You cannot see what they write until the report releases.
              </div>
              {/*
                THE APPROVAL RULE, SAID BEFORE SOMEBODY IS ADDED RATHER THAN DISCOVERED AFTERWARDS.

                "When you add a participant that is one on the org, the org has to approve. Do
                people know this when they add someone?" They did not: the rule fires on somebody
                from OUTSIDE the organisation invited by a lead who is not an admin, and the first
                anybody heard of it was a roster row that looked like the person ignoring an email.

                SAID AS THE RULE, NOT AS A PREDICTION ABOUT THIS ADDRESS. Working out in advance
                whether a particular person will need approval means looking up whether that email
                already has an account and where it lives - which would let anybody test whether an
                address is a Groundwork user by typing it into this box. The rule is true for
                everybody and discloses nothing.
              */}
              <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 7, padding: '8px 10px', marginBottom: 10, lineHeight: 1.55 }}>
                {/*
                  THE RULE WAS TRUE AND THIS WAS THE ONE SCREEN WHERE IT DOES NOT APPLY.

                  Walked with a real outside address, from a different domain, added here: no
                  approval was asked for, the person went straight into a check-in, their invite
                  page said nothing about being from outside, and there was no row to see it on.

                  Nothing is broken. `whyTheyDoNotNeedApproval` returns "an admin of this
                  organisation added them, which is the approval" - see
                  nobody-joins-your-company-by-being-invited-to-a-check-in.ts, which is deliberate
                  and right, because asking an admin to approve their own action is a queue with
                  one item in it that they put there.

                  So the panel was describing the rule from the one place it is exempt. An admin
                  reading it expects a queue that will never appear, and misses the thing that
                  actually happens: the person gets a login here and shows up on People.
                */}
                {isOrgAdmin
                  ? 'You are an admin here, so adding somebody is the approval - there is no queue. Anybody from outside your organisation gets a login here and appears on your People page, where you can take them off again.'
                  : 'Somebody from outside your organisation is invited straight away, and an admin here has to let them in before they can check in. They are told the same thing, and you can see it beside their name on the Sessions tab.'}
              </div>
              {/*
                AND WHERE THE ROWS ARE. "You will see that on their row" was said on a panel with
                no rows on it: this fold is an add form and a toast, and after adding two people it
                still showed neither of them. The roster itself is real, complete and better than
                anything a second copy here would be - delivery state, waiting for a seat, waiting
                on your organisation, remind, fix a bounced address - and it lives on Sessions. So
                this points at it rather than growing a rival list that would drift.
              */}
              <button
                onClick={() => setTab('checkins')}
                style={{ background: 'none', border: 'none', padding: 0, marginBottom: 10, fontSize: 12, color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                See who is in it, and where each of them has got to &rarr;
              </button>
              {/*
                * THE PEOPLE ALREADY HERE, FIRST, PICKED LIKE A GROUP CHAT. "Should be able to click team
                * and see a list and select like how you add people to WhatsApp groups." Search, tick,
                * one button; each is added the way the box below adds one. The box stays for an outsider.
                */}
              <PeoplePicker
                people={colleagues ?? []}
                alreadyIn={(((ground as any)?.participants ?? []) as any[]).map((m) => m.email ?? '')}
                adding={addingMany}
                onAdd={(picked) => addManyParticipants(picked.map((p) => p.email))}
              />
              <input
                type="email" placeholder="name@company.com" aria-label="Their email address"
                value={newParticipantEmail} onChange={(e) => setNewParticipantEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }}
              />
              <input
                type="text" placeholder="What do you want them to cover? (optional)" aria-label="What they are accountable for"
                value={newParticipantNote} onChange={(e) => setNewParticipantNote(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }}
              />
              <input
                type="text" placeholder="Their department (optional)" aria-label="Their department"
                value={newParticipantDepartment} onChange={(e) => setNewParticipantDepartment(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10, outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => addParticipantMut.mutate()}
                  disabled={!newParticipantEmail.includes('@') || addParticipantMut.isPending}
                  style={{ padding: '9px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: newParticipantEmail.includes('@') ? 1 : 0.4 }}
                >
                  {addParticipantMut.isPending ? 'Inviting…' : 'Send invite'}
                </button>
                {/*
                  * ADDING FOUR PEOPLE SHOULD NOT BE FOUR VISITS TO THE SAME FORM.
                  *
                  * "You should be able to add many parties to the check-in at setup and add context
                  * about them." The form took one address, sent it, and cleared itself - so a team
                  * of six was six rounds of typing, pressing, waiting for the invite to go, and
                  * finding the box again.
                  *
                  * The queue below is the fix and it keeps the part that matters: each person keeps
                  * their OWN line about what they are accountable for, because "what do you want
                  * them to account for" is the difference between a check-in that asks each person
                  * the right question and one that asks everybody the same one. A bulk paste of
                  * addresses would have been easier to build and would have thrown that away.
                  */}
                <button
                  onClick={() => {
                    const email = newParticipantEmail.trim().toLowerCase()
                    if (!email.includes('@')) return
                    if (queuedToAdd.some((q) => q.email === email)) return
                    setQueuedToAdd([...queuedToAdd, { email, note: newParticipantNote.trim() }])
                    setNewParticipantEmail('')
                    setNewParticipantNote('')
                  }}
                  disabled={!newParticipantEmail.includes('@')}
                  style={{ padding: '9px 14px', borderRadius: 7, background: 'white', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 700, border: '1px solid var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit', opacity: newParticipantEmail.includes('@') ? 1 : 0.4 }}
                >
                  + Add another
                </button>
              </div>

              {queuedToAdd.length > 0 && (
                <div style={{ marginTop: 12, border: '1px solid var(--gw-border)', borderRadius: 8, overflow: 'hidden' }}>
                  {queuedToAdd.map((q, i) => (
                    <div
                      key={q.email}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 11px', borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined, background: 'white' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-all' }}>{q.email}</div>
                        <div style={{ fontSize: 11.5, color: q.note ? 'var(--gw-sub)' : 'var(--gw-muted)', lineHeight: 1.45 }}>
                          {q.note || 'No note - they will be asked the general questions for this situation.'}
                        </div>
                      </div>
                      <button
                        onClick={() => setQueuedToAdd(queuedToAdd.filter((x) => x.email !== q.email))}
                        aria-label={`Remove ${q.email}`}
                        style={{ background: 'none', border: 'none', color: 'var(--gw-muted)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, fontFamily: 'inherit' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div style={{ padding: '9px 11px', borderTop: '1px solid var(--gw-border)', background: 'var(--gw-bg)' }}>
                    <button
                      onClick={() => inviteTheQueue.mutate()}
                      disabled={inviteTheQueue.isPending}
                      style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: inviteTheQueue.isPending ? 0.6 : 1 }}
                    >
                      {inviteTheQueue.isPending
                        ? 'Inviting…'
                        : `Invite ${queuedToAdd.length} ${queuedToAdd.length === 1 ? 'person' : 'people'}`}
                    </button>
                  </div>
                </div>
              )}
              {lastInvitedEmail && (
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8, color: lastInviteWaits ? 'var(--gw-amber-t)' : 'var(--gw-green-t)' }}>
                  {whyItWaits
                    ? `${lastInvitedEmail} is on the check-in. ${whyItWaits}`
                    : lastInviteWaits
                      ? `${lastInvitedEmail} is on the check-in. Their invitation goes out on the start date.`
                      : `Invite sent to ${lastInvitedEmail}`}
                </div>
              )}
            </div>
            {/*
              THE ACCESS CODE, BESIDE THE CONTROL THAT ADDS PEOPLE.
              It used to sit near the closing controls with a billing link, two bands below the
              only question it answers: how does somebody get into this check-in.
            */}
            <button
              onClick={() => { setShareCodeId(id ?? null); setShareCodeModalOpen(true) }}
              style={{ background: 'none', border: 'none', padding: 0, marginTop: 10, fontSize: 12.5, fontWeight: 600, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              Or share an access code instead
            </button>
            {isInitiator && ground.joinToken && (
              <div style={{ marginTop: 12 }}>
                <ShareSection joinToken={ground.joinToken} />
              </div>
            )}
            </Fold>
            </>
          )}
          {/**
            * WHAT IS TRUE ABOUT YOU, FOR A LEAD WHO IS ALSO IN IT.
            *
            * Your role, your status, how many sessions you have finished. It lived only on the
            * party view, so a lead had to leave this page to see their own standing in their own
            * check-in. The last thing that sent them away.
            *
            * The party view puts it above the panels somebody else fills in, deliberately - see
            * `MyParticipation`. Here the panels ARE yours to fill in, so it goes first for a
            * simpler reason: it is about you and they are about the check-in.
            */}
          {viewerIsAParty && (
            <Fold
              {...foldProps(setupBand())}
              title="You in this check-in"
              src="your role, your standing, and what you have finished"
              summary={`${mySessionsDone} of ${plannedSessions ?? '?'} of your sessions done`}
            >
              <MyParticipation
                viewer={user}
                ground={ground}
                myParticipant={(ground.participants ?? []).find((p: any) => p.userId === user?.id)}
                completedCount={mySessionsDone}
                totalSessions={plannedSessions ?? null}
              />
            </Fold>
          )}
            {/*
              THE DEFINING CHOICE GOES FIRST, AND SAYS WHAT IT DECIDES.
              
              It was filed halfway down the tab behind a paragraph, under a heading that asked a
              question about the people rather than naming its consequence. It is not a preference:
              it changes the shape of the board and the wording of every question, because where
              nobody can see anybody else's work, nobody is in a position to confirm anybody else's
              account.
              
              So it leads the tab, and the line under it says the thing it decides.
            */}
            {/* WHETHER THESE PEOPLE ACTUALLY SEE EACH OTHER'S WORK.
                The scenario can only guess, and the guess decides whether the
                board's fairness reads have anything to stand on. Where nobody can
                corroborate anybody, a quiet account is just a quiet account - and
                treating it as work going missing is how a competent person gets
                reported as absent on a ground that decides their job. */}
            {isInitiator && (
              <>
            <Fold {...foldProps(setupBand())} title="Who can corroborate whom" src="whether these people can see each other's work" summary={ground.peopleWorkTogether == null ? 'Not answered - assumed from the kind of check-in' : ground.peopleWorkTogether ? 'They work together' : 'They work separately'}>
            {/* The line that says what the first question here decides. It used to sit above the
                band, outside it, so it read as a caption for the whole tab. */}
            <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', lineHeight: 1.55, marginBottom: 4 }}>
              The first one decides whether people here can corroborate each other.
            </div>
              <div className="gw-fld">
                <label className="gw-label">Do these people work together?</label>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.5 }}>
                  Can they see each other's work day to day? If they cannot, nobody here is in a position
                  to confirm what anyone else said, and the board says so rather than reading somebody
                  being quiet as work going missing.
                </div>
                <div role="radiogroup" aria-label="Do these people work together?" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { v: true, label: 'Yes, they work together', sub: 'They see each other\'s work, so they can corroborate each other.' },
                    { v: false, label: 'No, they work separately', sub: 'Same role or same programme, different places. Nobody sees anybody else\'s work.' },
                  ].map((o) => {
                    const current = ground.peopleWorkTogether
                    const selected = current === o.v
                    return (
                      <div key={String(o.v)} role="radio" aria-checked={selected}
                        tabIndex={selected || (current == null && o.v) ? 0 : -1}
                        aria-label={`${o.label}. ${o.sub}`}
                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLElement).click() } }}
                        onClick={() => groundsApi.setPeopleWorkTogether(id!, o.v)
                          .then(() => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['ground', id] }) })
                          .catch(() => toast.error('Not saved. What you typed is still here — try again.'))}
                        className={`cg-sit-card${selected ? ' selected' : ''}`}
                        style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{o.label}</div>
                          <div style={{ width: 15, height: 15, borderRadius: '50%', flexShrink: 0, border: `2px solid ${selected ? 'var(--gw-navy)' : 'var(--gw-border)'}`, background: selected ? 'var(--gw-navy)' : 'transparent' }} />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.45, marginTop: 2 }}>{o.sub}</div>
                      </div>
                    )
                  })}
                </div>
                {ground.peopleWorkTogether == null && (
                  <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 6, lineHeight: 1.5 }}>
                    Not set. Until you answer, this is assumed from the kind of check-in you chose.
                  </div>
                )}
              </div>
            </Fold>
              </>
            )}
            {/**
              * WHAT WAS CHANGED, AND WHEN. W14-3.
              *
              * The server has been keeping this log since timeline editing shipped and nothing has
              * ever read it back out. It belongs here, next to the controls that write it: how long
              * this runs and how often people check in can both be changed after people have already
              * started answering, and a change nobody can see is the shape of thing this product
              * exists to stop.
              *
              * Shown to every party, not only the lead. The person whose sessions moved is the one
              * with the most reason to know.
              */}
            {/**
              * THE TEAM'S STARTING POINT, on the settings tab because that is where the ground's own
              * facts live. Stating it is the lead's; reading it is everybody's, so the party view
              * mounts the same component with `canState` false.
              */}
            <Fold {...foldProps(setupBand())} title="What good looks like" src="the yardstick, and where this stood at the start" summary={'stated by the lead, read by everybody'}>
            {/*
              THE YARDSTICK IS THE LEAD'S, EVEN FOR AN ADMIN.

              "as an admin i still see setup changes i can make on a page that is not mine." Walked
              as a second admin, these were the only two controls on the whole Setup tab that
              changed the check-in - and they change the standard somebody else is being read
              against, on a check-in an admin is not running and has not been part of a single
              session of. The product's own rule is that the person being read does not set the
              measure; a third party restating it without the lead is the same problem wearing a
              different hat.

              An admin still sees all of it, and the banner at the top of the page says exactly what
              is theirs to decide: releasing the report and closing the check-in are the lead's,
              and now so is this.
            */}
            <BaselinePanel groundId={id!} canState={isInitiator} />
            {/**
              * WHERE THIS STOOD, under what doing well looks like, because the pair is the point: the
              * yardstick and the starting point together are what let a report say something moved.
              */}
            <StartingPointPanel groundId={id!} canRecord={isInitiator} />
            </Fold>

            {settingsChangeCount > 0 && (
            <Fold {...foldProps(setupBand())} title="What has changed here" src="every change to the length or the cadence, and who made it" summary={settingsChangeCount === 1 ? '1 change since setup' : `${settingsChangeCount} changes since setup`}>
            <div style={{ display: 'contents' }}>
              <div style={{ background: 'var(--gw-card)', border: '1px solid var(--gw-line)', borderRadius: 10, padding: '13px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>What has been changed here</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[...(ground as any).settingsChanges].reverse().map((c: any, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--gw-ink)' }}>
                        {c.weeks && `How long this runs: ${c.weeks.from ?? 'not set'} to ${c.weeks.to} weeks. `}
                        {c.cadence && `How often people check in: ${c.cadence.from ?? 'not set'} to ${c.cadence.to}. `}
                      </span>
                      Changed by the {c.by} on {new Date(c.changedAt).toLocaleDateString()}.
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </Fold>
            )}
            {/* HOW LONG THIS RUNS, AND HOW OFTEN.
                There was no way to change either after creation, anywhere in the
                product. A ground created at the wrong length - which the old
                admin creation form did silently, because it never asked - was
                stuck that way, and a three-month onboarding that thinks it is a
                thirty-day one stops asking people to check in two thirds of the
                way through. */}

            <Fold {...foldProps(setupBand())} title="How long this runs" src="when it starts, how long it runs, and how often people check in" summary={`${ground.timelineDays ?? '?'} days, ${String(ground.cadence ?? '').toLowerCase().replace('_',' ') || 'no cadence set'}`}>

            {/*
              WHEN IT STARTS, WHICH HAD NO CONTROL ANYWHERE.

              "There is no start date on setup. Where does it exist." On the check-in, and it
              decides two real things: an invitation for somebody added before the start is held
              and sent on that day, and session 1 stays shut until then. It could be set when the
              check-in was created and never again - so a new hire whose start moved by a week left
              a check-in opening on the wrong day with no way to say so.

              It disappears once somebody has answered rather than refusing on press: from that
              point the start is the thing everything else is measured from, and the server says so
              too, because a control being hidden is not a rule.
            */}
            {isInitiator && mySessionsDone === 0 && sessionRows.length === 0 && (
              <div className="gw-fld">
                <label className="gw-label" htmlFor="starts-at">When it starts</label>
                <input
                  id="starts-at"
                  className="gw-input"
                  type="date"
                  value={startsAtDraft}
                  onChange={(e) => setStartsAtDraft(e.target.value)}
                />
                <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 5, lineHeight: 1.55 }}>
                  Session 1 opens on this day, and anybody you add before it is invited on it. Leave
                  it empty to open the check-in as soon as people are added.
                </div>
                <button
                  disabled={startsAtDraft === startsAtOnRecord}
                  onClick={() => groundsApi.update(id!, { startsAt: startsAtDraft || undefined })
                    .then(() => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['ground', id] }) })
                    .catch((e: any) => toast.error(e?.response?.data?.message ?? 'The start date did not change - try again.'))}
                  style={{ marginTop: 8, fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: '1px solid var(--gw-blue-b)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', opacity: startsAtDraft === startsAtOnRecord ? 0.4 : 1 }}
                >
                  Save start date
                </button>
              </div>
            )}            {isInitiator && (
              <div className="gw-fld">
                <label className="gw-label">How long this runs</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="gw-input" aria-label="Timeframe" value={timelineDaysDraft}
                    onChange={(e) => setTimelineDaysDraft(Number(e.target.value))} style={{ background: 'white' }}>
                    {[7, 14, 21, 30, 60, 90, 180, 365].map((d) => (
                      <option key={d} value={d}>{d === 7 ? '1 week' : d === 14 ? '2 weeks' : d === 21 ? '3 weeks' : d === 365 ? '12 months' : d === 180 ? '6 months' : `${d} days`}</option>
                    ))}
                  </select>
                  <select className="gw-input" aria-label="Check-in cadence" value={cadenceDraft}
                    onChange={(e) => setCadenceDraft(e.target.value as GroundCadence)} style={{ background: 'white' }}>
                    {SELECTABLE_CADENCES.map((c) => <option key={c.cadence} value={c.cadence}>{c.label}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 6 }}>
                  {sessionsFor(timelineDaysDraft, cadenceDraft) ?? 1} sessions over {timelineDaysDraft} days.
                  {' '}Sessions already completed are never removed.
                </div>
                {/*
                  AND WHAT HAPPENS AT THE END OF THEM, WHICH NOTHING SAID.

                  A check-in does not just run out. On the last session everybody is asked how it
                  closes, and it ends on an agreed answer. That screen is the point of the whole
                  thing for some scenarios, and the only way to learn it exists was to reach it -
                  which on a three-month run means three months. So the number of sessions was a
                  countdown to something nobody had been told about.

                  Here, next to the control that sets the number, because this is the moment a
                  person is deciding how long it should be and the ending is what they are deciding
                  the length of.
                */}
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4, lineHeight: 1.55 }}>
                  On the last one, everybody is asked how this should close, and it ends on the
                  answer you agree.
                </div>
                <button
                  disabled={timelineDaysDraft === ground.timelineDays && cadenceDraft === ground.cadence}
                  onClick={() => groundsApi.update(id!, { timelineDays: timelineDaysDraft, cadence: cadenceDraft })
                    .then(() => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['ground', id] }) })
                    .catch(() => toast.error('The length did not change — try again.'))}
                  style={{ marginTop: 8, fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: '1px solid var(--gw-blue-b)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', opacity: (timelineDaysDraft !== ground.timelineDays || cadenceDraft !== ground.cadence) ? 1 : 0.4 }}
                >
                  Save timeframe
                </button>
              </div>
            )}
            </Fold>
            <Fold {...foldProps(setupBand())} title="What it is" src="what it is called, and which situation it runs as" summary={ground.label}>
            <div className="gw-fld">
              <label className="gw-label">Name</label>
              <input className="gw-input" value={groundLabel} onChange={e => setGroundLabel(e.target.value)} />
              <button
                disabled={!groundLabel.trim() || groundLabel === ground.label}
                onClick={() => { if (groundLabel.trim() && groundLabel !== ground.label) groundsApi.update(id!, { label: groundLabel.trim() }).then(() => qc.invalidateQueries({ queryKey: ['ground', id] })).catch(() => toast.error('The name did not change — try again.')) }}
                style={{ marginTop: 6, fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: '1px solid var(--gw-blue-b)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', opacity: (groundLabel.trim() && groundLabel !== ground.label) ? 1 : 0.4 }}
              >
                Save name
              </button>
            </div>
            <div className="gw-fld">
              <label className="gw-label">Scenario</label>
              <select
                className="gw-input"
                value={groundScenario}
                onChange={e => setGroundScenario(e.target.value)}
                style={{ background: 'white' }}
              >
                {([
                  ['NEW_HIRE', 'New hire'],
                  ['NEW_PROJECT', 'New project'],
                  ['NEW_ADVISOR', 'New board member'],
                  ['NEW_COFOUNDER', 'New partner'],
                  ['CONTRACT_RENEWAL', 'Contract renewal'],
                  ['PIP', 'PIP'],
                  ['OKR_ALIGNMENT', 'Goals & planning'],
                  ['PULSE_CHECK', 'Pulse check'],
                  ['DRIFT', 'New direction'],
                ] as [string, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button
                disabled={!groundScenario || groundScenario === ground.scenario}
                onClick={() => { if (groundScenario && groundScenario !== ground.scenario) groundsApi.update(id!, { scenario: groundScenario } as any).then(() => qc.invalidateQueries({ queryKey: ['ground', id] })).catch(() => toast.error('The situation did not change — try again.')) }}
                style={{ marginTop: 6, fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: '1px solid var(--gw-blue-b)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', opacity: (groundScenario && groundScenario !== ground.scenario) ? 1 : 0.4 }}
              >
                Save scenario
              </button>
            </div>
            </Fold>
            {/*
              THE THREE RULES THAT DECIDE WHAT PEOPLE SEE, IN ONE PLACE. W14-4.

              Two of them had controls and the third - the one that decides whether a participant
              can see who else is in the ground at all - had none, though its endpoint has been
              live and tested the whole time. So the strongest of the three was set by a default
              nobody could read.

              They are together because they are one question with three parts, and because the
              contact toggle's own copy used to promise "participants can see who's here", which
              is not true when this one is off.
            */}
            {/*
              * ONE HEADING FOR THE TWO SETTINGS THAT ARE ONE QUESTION.
              *
              * "The setup tab can have fewer cards, some things can be dropdowns, some texts or
              * spacing could make more sense." These were the clearest case: two `gw-fld` blocks,
              * two headings, two bordered cards and two paragraphs - "Can the people here see each
              * other?" and "Participant contact details" - for what a person thinks of as one
              * decision, who can see whom. The second even explains itself in terms of the first
              * ("this matters again if you turn the setting above on"), which is a card admitting
              * it should not be a separate card.
              */}
            <Fold {...foldProps(setupBand())} title="Who can see whom" src="two settings, one question" summary={peersVisible ? 'Everyone here sees who else is in it' : 'Each person sees only themselves'}>
            <div className="gw-fld">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '1px solid var(--gw-blue-b)', borderRadius: '8px 8px 0 0' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 4 }}>
                    Show who else is in this check-in
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                    {peersVisible
                      ? 'Each person sees the others by name and whether they have checked in. Nobody ever sees what anybody wrote. On a team delivering together, that is how people coordinate.'
                      : 'Each person sees only themselves. On a period that decides something about a person, a roster tells everyone exactly who they are being measured against, which turns a record meant to help them into a leaderboard.'}
                  </div>
                  {(ground as any)?.peersVisibleToEachOther == null && (
                    <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 5 }}>
                      Not set, so this check-in uses the default for its kind: {peersDefaultHidden ? 'hidden' : 'shown'}.
                    </div>
                  )}
                </div>
                <button
                  role="switch"
                  aria-checked={peersVisible}
                  aria-label="Show who else is in this check-in"
                  disabled={setPeerVisibility.isPending}
                  onClick={() => setPeerVisibility.mutate(!peersVisible)}
                  style={{ flexShrink: 0, width: 42, height: 24, borderRadius: 999, border: 'none', cursor: setPeerVisibility.isPending ? 'wait' : 'pointer', background: peersVisible ? 'var(--gw-navy)' : '#CFD8E3', position: 'relative', transition: 'background 0.15s', opacity: setPeerVisibility.isPending ? 0.5 : 1, padding: 0 }}
                >
                  <span style={{ position: 'absolute', top: 2, left: peersVisible ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            </div>

            {/* The second half of the same question, so it carries no heading of its own and sits
                directly under the first - one card, two rows, read top to bottom. */}
            <div className="gw-fld" style={{ marginTop: -8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '1px solid var(--gw-blue-b)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 4 }}>Hide email addresses between participants</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                    {contactHidden
                      ? (peersVisible
                          ? "Participants can see who's here (names, roles, and presence) but can't see each other's email addresses. Good for cohorts of individuals who don't need to contact each other."
                          : "Nobody sees anybody else here, so there are no addresses to hide. This matters again if you turn the setting above on.")
                      : "Participants can see each other's email addresses. Only turn this off when everyone is meant to be in contact. Turning it off lets participants collect each other's contacts."}
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={contactHidden}
                  aria-label="Hide email addresses between participants"
                  disabled={setContactVisibility.isPending}
                  onClick={() => setContactVisibility.mutate(!contactHidden)}
                  style={{ flexShrink: 0, width: 42, height: 24, borderRadius: 999, border: 'none', cursor: setContactVisibility.isPending ? 'wait' : 'pointer', background: contactHidden ? 'var(--gw-navy)' : '#CFD8E3', position: 'relative', transition: 'background 0.15s', opacity: setContactVisibility.isPending ? 0.5 : 1, padding: 0 }}
                >
                  <span style={{ position: 'absolute', top: 2, left: contactHidden ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            </div>
            </Fold>
            {/*
              CODES AND BILLING WERE NOT SETUP QUESTIONS.

              "What is not needed on the setup page, and why do we have codes and billing in the
              setup?" Right on both. Billing is an ORGANISATION's business and already has its own
              door in the sidebar - it has nothing to do with how this check-in runs. And an access
              code is how somebody GETS IN, so it belongs beside the control that adds people,
              which is band 1. Both moved rather than deleted.
            */}
            <Fold {...foldProps(setupBand())} title="Ending it" src="closing is not reversible" summary={'archiving is done by hand for now'}>
            <div style={{ padding: 14, background: 'var(--gw-red-bg)', border: '1px solid var(--gw-red-b)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-red-t)', marginBottom: 6 }}>Close check-in</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                Closing a check-in permanently archives it. All parties keep their records. This action cannot be undone.
                {isOrgAdmin && !isInitiator && ' You are not the lead here, so closing it ends something somebody else is running.'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 8 }}>
                Self-serve close is coming. For now, email{' '}
                <a href={`mailto:hello@myground.work?subject=Archive check-in: ${encodeURIComponent(ground.label)}`} style={{ color: 'var(--gw-navy)', textDecoration: 'underline' }}>hello@myground.work</a>
                {' '}and we will archive it manually.
              </div>
              <button disabled style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-red-t)', background: 'none', border: '1px solid var(--gw-red-b)', padding: '8px 14px', borderRadius: 6, cursor: 'not-allowed', fontFamily: 'inherit', opacity: 0.4 }}>
                Close this check-in
              </button>
            </div>

            {/*
              AND THE OTHER THING PEOPLE ACTUALLY WANT, WHICH IS NOT CLOSING.

              "they can clear any test chats/checkins they run. I suspect this is likely to happen
              with new users." It is what happens: the first thing anybody does is try this on
              something invented, and the only way to be rid of it was to email us - so a new
              account fills up with "test" and "asdf" sitting in the rail beside a real check-in.

              Deleting and closing are not degrees of the same act and are not offered as though
              they were. Closing keeps everybody's record and ends the work; deleting is for a thing
              that was never work. The server draws the line rather than this page: it refuses the
              moment anybody else has given an account, and says who, so a check-in cannot be
              cleared out from under somebody who wrote in confidence and is not being asked.
            */}
            {isInitiator && (
              <div style={{ marginTop: 10, padding: 14, background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>Delete it, if it was only a test</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                  For the ones you started to see how this works. It goes completely - the
                  conversation, the sessions and anything uploaded. If somebody else has already
                  answered, this refuses and tells you: that is a record, not a test, and
                  closing is the thing to do with it.
                </div>
                {deleteError && (
                  <div style={{ fontSize: 12, color: 'var(--gw-red-t)', lineHeight: 1.6, marginBottom: 10, background: 'var(--gw-red-bg)', border: '1px solid var(--gw-red-b)', borderRadius: 6, padding: '9px 11px' }}>
                    {deleteError}
                  </div>
                )}
                {confirmDelete ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--gw-text)' }}>Delete “{ground.label}” for good?</span>
                    <button
                      onClick={() => removeGround.mutate()}
                      disabled={removeGround.isPending}
                      style={{ fontSize: 13, fontWeight: 700, color: 'white', background: 'var(--gw-red-t)', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: removeGround.isPending ? 'wait' : 'pointer', fontFamily: 'inherit' }}
                    >{removeGround.isPending ? 'Deleting…' : 'Yes, delete it'}</button>
                    <button
                      onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                      style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-sub)', background: 'none', border: '1px solid var(--gw-border)', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
                    >Keep it</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setDeleteError(null); setConfirmDelete(true) }}
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-red-t)', background: 'none', border: '1px solid var(--gw-red-b)', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Delete this check-in</button>
                )}
              </div>
            )}
            </Fold>
            {/*
              HOW FAR THROUGH SETUP SOMEBODY IS.

              AFTER the questions rather than above them, and that is a fact about the count rather
              than a design preference: `setupBand()` increments as each fold renders, so the total
              does not exist until they have. Read before the first fold it would say zero of zero
              on the first paint and correct itself on the second, which is worse than sitting at
              the foot where it is right the first time - and a tally of what you have reviewed is
              a footer anyway.
            */}
            {isInitiator && setupBands > 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 14, lineHeight: 1.55 }}>
                {howFarThroughSetup(setupChecked, setupBands)}
              </div>
            )}
          </div>
        )}
      </div>
      {shareCodeModalOpen && (
        <div
          onClick={() => setShareCodeModalOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Share an access code</span>
              <button onClick={() => setShareCodeModalOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {shareCardLoading && (
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, textAlign: 'center', padding: 24 }}>Loading…</div>
            )}
            {!shareCardLoading && shareCardData && (
              <CodeShareCard
                code={shareCardData.code}
                expiresAt={shareCardData.expiresAt}
                daysRemaining={shareCardData.daysRemaining}
                note={shareCardData.note}
                allowCodeCreation={shareCardData.allowCodeCreation}
                onCopy={() => toast.success('Code copied')}
              />
            )}
            {!shareCardLoading && !shareCardData && (
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, textAlign: 'center', padding: 24 }}>No share code available for this check-in.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: 'var(--gw-bg)' }}>{children}</div>
}

function ShareSection({ joinToken }: { joinToken: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const baseUrl = window.location.origin
  const joinUrl = `${baseUrl}/join?t=${joinToken}`

  useEffect(() => {
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(joinUrl, { width: 180, margin: 1 }).then(setQrDataUrl).catch(() => {})
    }).catch(() => {})
  }, [joinUrl])

  function copyLink() {
    navigator.clipboard?.writeText(joinUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px', marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Broadcast link</div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub-d)', lineHeight: 1.6, marginBottom: 14 }}>
        Share this link or QR code - anyone can check in without signing up first. They'll be asked to save their details at the end.
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR code" style={{ width: 100, height: 100, borderRadius: 6, border: '1px solid var(--gw-border)', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 6, wordBreak: 'break-all', fontFamily: 'monospace' }}>{joinUrl}</div>
          <button
            onClick={copyLink}
            style={{ padding: '8px 14px', borderRadius: 7, background: copied ? 'var(--gw-green-bg)' : 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', color: copied ? 'var(--gw-green-t)' : 'var(--gw-dark)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  )
}
