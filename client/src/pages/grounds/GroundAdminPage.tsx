import { AnAdminDecidesWhetherItStarts } from './an-admin-decides-whether-it-starts'
import { howItEnded, hasStalled, itRanOutOfTime } from '@/lib/a-ground-that-has-ended'
import { scrollToId } from '@/lib/scroll-to'
import { whenItRunsOut, sayHowLongIsLeft } from '@/lib/when-it-runs-out'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { hasDoneThisSession, whichSessionIsThisCheckInOn } from '@/lib/which-session-are-we-on'
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ContextPage } from '@/components/gw/ContextPage'
import { ReferencesAndResourcesPage } from './ReferencesAndResources'
import { MyWorkPage } from './MyWorkPage'
import { REFERENCES_AND_RESOURCES } from '@/lib/the-references-tab'
import { YourWork } from '@/components/gw/checkin/YourWork'
import { Note, Callout, Button, Panel, Stack, Empty, Folded, Modal, Skeleton } from '@/components/gw/ui'
import { theClosingAfterYourFirstCheckIn, takeTheFirstCheckInClosing, theRhythmInFull } from '@/lib/the-closing-after-your-first-check-in'
import { GroundGone } from '@/components/gw/GroundGone'
import { useAuthStore } from '@/stores/auth'
import { groundsApi, type GroundCadence } from '@/api/grounds'
import { authApi } from '@/api/auth'
import { workingDaysOf } from '@/components/gw/when-the-check-ins-land'
import { cadenceLabel } from '@/lib/cadence'
import { personLabel as onePersonsLabel, peopleLabels, atTheStart } from '@/lib/utils'
import { TheReportIsAListOfSessions, type SessionRow } from '@/components/gw/TheReportIsAListOfSessions'
import { buildSessionRows } from '@/lib/session-rows'
import { reportsApi } from '@/api/reports'
import { participantsApi } from '@/api/participants'
import { toast } from 'sonner'
import { CodeShareCard } from '@/components/CodeShareCard'
import { useOpenSession } from '@/hooks/useOpenSession'
import { SessionPaywallModal } from '@/components/gw/checkin/SessionPaywallModal'
import { BetweenCheckIns } from '@/components/gw/BetweenCheckIns'
import { UntilTheNextOne } from '@/components/gw/UntilTheNextOne'
import { ChatPage } from '@/pages/chat/ChatPage'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { CheckInHeader } from '@/components/gw/ui/CheckInHeader'
import { Page } from '@/components/gw/ui/Page'
import { billingApi } from '@/api/billing'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'
import { rememberWhoWasNotInvited } from './who-was-not-invited'
import { TheyWereNotInvited } from './TheyWereNotInvited'
import { SendTheReportToEveryone } from '@/components/gw/SendTheReportToEveryone'
import { GETTING_YOUR_FIRST_QUESTION_READY } from '@/lib/opening-is-slow'

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
type Tab = 'chat' | 'overview' | 'myrecord' | 'docs' | 'report' | 'settings'

/**
 * The shared tab keys from `ground-tabs.ts`, and this page's own older names for the same tabs.
 * Both directions, in one place, so the URL and the tab row cannot disagree about what `context`
 * means.
 */
const FROM_TAB_KEY: Record<string, Tab> = {
  chat: 'chat', report: 'report', sessions: 'settings', checkins: 'settings', context: 'docs', settings: 'settings',
  /**
   * B-223: `?tab=mywork` AND `?tab=people` ARE THE OUTER TAB ROW'S OWN KEYS (see `outerTabOf`
   * and the tab row's definition below), not in this map before now - so a link carrying either
   * one fell all the way through to the hardcoded fallback, which did not recognise them either,
   * and landed on `chat`: the Check-in tab, which silently opens the reader's own session the
   * moment it mounts. Arriving on My work or People and setup must never open a session - only
   * going to the Check-in tab itself, or pressing to start, does that. `people` has exactly one
   * tab behind it, `settings`; `mywork` has several (Check-ins, My record, Report), so it needs a
   * single landing tab too - `checkins` is in that group for every reader (`outerTabOf` returns
   * `'mywork'` for it) and is never the Check-in tab, so it can never trigger the auto-open.
   */
  mywork: 'myrecord', people: 'settings',
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
  chat: 'chat', report: 'report', myrecord: 'record', docs: 'context', settings: 'settings',
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
  /* U.6: WhatsApp is only mentioned while it is switched on (GET /auth/whatsapp), as well as connected. */
  const whatsAppIsOn = useWhatsAppIsOn()
  /**
   * REVIEW ROUND 3, ITEM 2: THE LEAD'S CHECK-IN TAB OPENS HER OWN CONVERSATION DIRECTLY.
   *
   * It used to send her to `/grounds/:id/p?open=1` to borrow GroundParticipantPage's own
   * paywall-aware opening flow - a second page, with its own header and its own "Start my
   * check-in", for what should read as one check-in. Same shared hook that page now uses (see
   * useOpenSession.ts), called from here instead, so the lead never leaves this page for her own
   * session.
   */
  const { open: openMySession, openFailed: myOpenSessionFailed, openError: myOpenSessionError, retryOpen: retryMyOpenSession, paywall } = useOpenSession(id)
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
    return FROM_TAB_KEY[asked] ?? (['chat', 'docs', 'report', 'settings'].includes(asked) ? (asked as Tab) : 'chat')
  })
  /*
   * THE CURRENT TAB, READABLE FROM INSIDE AN ALREADY-IN-FLIGHT REQUEST. `tab` itself is fine for
   * anything that renders, but the auto-open effect below fires a request the moment the page
   * mounts on the Check-in tab, and that request can still be pending once the reader has clicked
   * away to another tab - `tab` as a plain closed-over value would answer with whatever it was
   * when the effect ran, not what it is now. See the effect, and useOpenSession's `shouldNavigate`.
   */
  const tabRef = useRef(tab)
  useEffect(() => { tabRef.current = tab }, [tab])
  /** So a tab can be linked to and come back to. Replace, not push: tabs are not history. */
  const goTab = (t: Tab) => {
    setTab(t)
    const key = TO_TAB_KEY[t]
    const next = new URLSearchParams(searchParams)
    if (key) next.set('tab', key); else next.delete('tab')
    /* Which conversation and which report are for the tab they were opened on, never the next one. */
    next.delete('c'); next.delete('report')
    setSearchParams(next, { replace: true })
  }
  /* People the wizard could not invite, kept against this ground so the toast that faded is not
     the only record. Read once on mount: it is unfinished business, not live data. */
  const [groundLabel, setGroundLabel] = useState('')
  /* Opened from the "give it more time"/"out of time" banners above the tabs, which live outside
     People and setup entirely - so switching there is not enough, the timeframe editor there has
     to open too. Passed down as `forceOpenTimeframe`; CheckInPeopleAndSetup opens on it once. */
  const [openTimeframe, setOpenTimeframe] = useState(false)
  const [timelineDaysDraft, setTimelineDaysDraft] = useState(90)
  const [cadenceDraft, setCadenceDraft] = useState<GroundCadence>('WEEKLY')
  /* Which days a check-in may open on. Empty means nobody said, which is not the same as every
     day - see WhichDaysTheyWork. This is the only place the rhythm can be changed after creation,
     and it carried no way to say "not at the weekend". */
  const [workingDaysDraft, setWorkingDaysDraft] = useState<number[]>([])
  /*
   * REQUEST 194 (8 October 2026): THE DAY CHECK-INS LAND ON, EDITABLE FROM "PEOPLE AND SETUP". The
   * same `cadenceAnchorDay` setup already offers while a check-in is being created
   * (TheSetup.tsx) - 0 to 6 for a weekly or fortnightly rhythm, 1 to 31 for a monthly one, `null` to
   * clear it - now editable afterwards too, through `PATCH /grounds/:id`, by whoever `mayChangeSetup`
   * says may change this check-in's setup.
   */
  const [anchorDayDraft, setAnchorDayDraft] = useState<number | null>(null)
  const [groundScenario, setGroundScenario] = useState('')
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false)
  const [newParticipantEmail, setNewParticipantEmail] = useState('')
  /* Their name, as the lead knows them (polish round 1, 26 October): without it, people who join from the phone had no name anywhere. */
  const [newParticipantName, setNewParticipantName] = useState('')
  /* The server's one count of how many of her own sessions are done, shared with People and setup (same key). Read before any early return. */
  const { data: servedSetup } = useQuery({ queryKey: ['people-and-setup', id], queryFn: () => groundsApi.peopleAndSetup(id!), enabled: !!id, retry: false })
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
  /* The start date as typed, against the one on record, so the save button knows if anything moved. */
  const [startsAtDraft, setStartsAtDraft] = useState('')
  /*
   * REVIEW ROUND 3, ITEM 3: THE SIGN-OFF STEP IS REMOVED - HER OWN INSTRUCTION, FOR EVERYONE, NOT
   * ONLY FOR AN ADMIN WHO DOES NOT RUN THE CHECK-IN.
   *
   * "I have read this - sign it off" was a second confirmation nobody asked for, on top of the
   * setup questions themselves; the prototype's own "Yes, set it" (ContextChat.tsx) is the
   * confirmation that matters - it is what actually changes a setting. `stepsYouHaveChecked` /
   * `rememberYouCheckedIt` / `forgetYouCheckedIt` / `howFarThroughSetup`, the whole sign-off
   * record and its tally, went with the button that called them.
   */
  const [shareCodeId, setShareCodeId] = useState<string | null>(null)
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null)
  // Fix-and-resend for bounced invites (participant must not have accepted)
  const [fixingEmailId, setFixingEmailId] = useState<string | null>(null)
  const [fixingEmailValue, setFixingEmailValue] = useState('')

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
   * A check-in that is genuinely gone answers 404 - OR 403: B-110 (GW-PRI-04). The two have to
   * read the same, because the only other true sentence for a 403 here ("you are not part of
   * this check-in") tells a stranger holding a stale link that something real sits behind it,
   * which is exactly what the 404 wording is written not to say. Anything else - a dropped
   * connection, a token being refreshed, a cold server - is a failure to load, and telling
   * somebody their check-in does not exist because their wifi blinked is the wrong sentence at
   * the worst moment.
   */
  const definitelyGone = isError && [404, 403].includes((error as any)?.response?.status)

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
   *
   * B-100: A SET-UP ROW IS NOT A SESSION, HERE EITHER. `mySessionDots` and the
   * session grid (`!c.isSetup`) all already leave the set-up conversation out, but this list fed
   * "Your reports" straight from the raw check-ins, so a lead who only manages read "Session 1,
   * your own" with a report to read even though "Your check-ins" on the very same page said
   * "Nothing on record yet" and the stat tile above it said she does not check in herself. One
   * rule, here too.
   */
  const mySessions = ((ground as any)?.checkIns ?? [])
    .filter((c: any) => c.status === 'COMPLETED' && !c.isSetup)
    .filter((c: any) => ((ground as any)?.participants ?? []).some((p: any) => p.id === c.participantId && p.userId === user?.id))
    .sort((a: any, b: any) => (b.sessionNumber ?? 0) - (a.sessionNumber ?? 0))

  /*
   * EVERYBODY ON THIS PAGE, NAMED ONCE (request 36). Their name, else the address the lead typed,
   * never the lead's note about them; with no name "a colleague", or "one colleague", "another
   * colleague", "a third colleague" when there are several, the same words the engine uses. The note
   * is still shown, beside the name, as the lead's own ("Your note: ...").
   */
  const labelsHere = peopleLabels((ground as any)?.participants ?? [], { forTheLead: true })
  const labelInASentence = (p: any): string => labelsHere.get(p?.id) ?? onePersonsLabel(p)
  /** At the start of a line: "Another colleague". */
  const personLabel = (p: any): string => atTheStart(labelInASentence(p))

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
  /* U.10: the counting itself now lives in lib/session-rows.ts, shared with the board's "Reports"
     table, which needs the same rows. See that file for what this used to be, inline, here. */
  const sessionRows: SessionRow[] = buildSessionRows(ground as any, user?.id, labelInASentence)

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
    onError: () => toast.error('The report was not released. Nobody has been sent anything - try again.'),
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
  const myParticipant = (ground?.participants ?? []).find((p: any) => p.userId === user?.id) ?? null
  const myParticipantId = myParticipant?.id ?? null
  const myOpenCheckIn = myParticipantId
    ? ((ground?.checkIns ?? []) as any[])
        .filter((c) => c.participantId === myParticipantId && c.status !== 'COMPLETED')
        .sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))[0] ?? null
    : null
  const myOpenAvailableFrom = (myOpenCheckIn as any)?.availableFrom ?? null
  /* REVIEW ROUND 3, ITEM 1's RULE, HERE TOO: an IN_PROGRESS session is open, whatever its
     availableFrom says - that date gates a session that has not started, not one already
     running. Same fix as GroundParticipantPage.tsx's myOpenForAutoOpen/opensLater. */
  const myOpenOpensLater = !!myOpenAvailableFrom && new Date(myOpenAvailableFrom).getTime() > Date.now() && (myOpenCheckIn as any)?.status !== 'IN_PROGRESS'
  /**
   * THE SAME TWO VALUES THE COMPOSER (AND, BEFORE ROUND 4, GroundChat) READ FOR "OPENS ON" - see
   * people-and-setup-as-each-reader-reads-it.spec.tsx, which pins this exact derivation as a source check,
   * and the Check-in tab's own redirect below, which uses `myOpenCheckInId` the same way.
   */
  const myOpenCheckInId = myOpenCheckIn && !myOpenOpensLater ? myOpenCheckIn.id : null
  const myNextOpensAt = myOpenOpensLater ? myOpenAvailableFrom : null

  /**
   * The start date on record, as an `<input type="date">` wants it - the first ten characters of
   * the ISO string, in UTC. Not `toLocaleDateString`, which would show a person west of UTC the
   * day before and then save it back.
   */
  const startsAtOnRecord = (ground as any)?.startsAt ? String((ground as any).startsAt).slice(0, 10) : ''

  /* The server's answer, which is what its routes test. The local formula stays only for the moment before the read lands. */
  const isInitiator = (ground as any)?.viewerIsInitiator ?? (!!ground && user?.id === ground.initiatorId)
  /* Same rule as GroundParticipantPage.tsx's canPayHere: both routes behind the paywall buttons
     are admin-only on the server. */
  const canPayForMySession = isInitiator && user?.role === 'ADMIN'

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
  const canRunThisGround = (ground as any)?.viewerRunsThisGround ?? (isInitiator || isOrgAdmin)
  /**
   * AND WHETHER THEY ARE IN IT, WHICH IS A DIFFERENT QUESTION.
   *
   * A lead is almost always also a party to their own check-in, and until now reaching their own
   * record meant leaving for a second page that looks identical to this one. It was computed inline
   * further down for the roster; named here because the tab row asks it too.
   */
  const viewerIsAParty = (ground?.participants ?? []).some((p: any) => p.userId === user?.id)
  /**
   * AND WHETHER SHE ANSWERS IT HERSELF, WHICH IS A THIRD QUESTION.
   *
   * A lead who only manages (`managingOnly`) IS a party (she is on `ground.participants`, same as
   * anybody else), but never gives her own account of a round - the same fact "Your sessions" and
   * every count on the Check-ins tab already leave her out for (`participantsWhoCheckIn` above).
   * The "Your check-in" tab and header button are a door to a check-in she does not do; this is
   * the same `managingOnly` rule, named for where a party who checks in is asked for.
   */
  const viewerChecksIn = viewerIsAParty && !(myParticipant as any)?.managingOnly

  /**
   * ROUND 4, ITEM A STEP 3: THE CHECK-IN TAB IS THE FOCUSED CONVERSATION, FOR A PARTY.
   *
   * `GroundChat`'s reading-and-hand-off experience is retired from this tab now that its two other
   * jobs (the session history, "who is in this") have somewhere to live (My work, People and
   * setup). A lead who is also a party is a real participant with her own check-in to answer - the
   * commonest case - so her Check-in tab goes straight to it.
   *
   * REVIEW ROUND 3, ITEM 2: NO MORE HAND-OFF TO THE PARTICIPANT PAGE. The `?open=1` trip to
   * `/grounds/:id/p` was there only to borrow that page's paywall-aware opening flow - now
   * `useOpenSession` (above), the same call the participant page itself makes. The lead's own
   * conversation opens from here, and she never lands on the other page for her own check-in.
   *
   * A `useEffect`, not a render-time `<Navigate>`, so this follows the same pattern the other
   * effect in this file (below) uses, and placed here - before every early return - so the hook
   * count cannot change between renders (rules of hooks), the same reason `showAsk` moved up top.
   */
  /*
   * DECISION 133 (walk fault 2): AFTER HER FIRST CHECK-IN THE LEAD CHECKS IN WHEN SHE CHOOSES. Opening
   * the Check-in tab (or any tab) never starts or opens a session for her; only "Check in yourself"
   * does. The same rule B-223 set for My work and People, for the lead on every tab.
   */
  /* Walk fault 3: the closing of the lead's first check-in, said once where she lands. */
  const [theFirstClosing] = useState(() => takeTheFirstCheckInClosing(id))
  const theLeadChecksInWhenSheChooses = isInitiator && ((ground?.checkIns ?? []) as any[])
    .some((c) => c.participantId === myParticipantId && c.status === 'COMPLETED' && !c.isSetup)
  const myOpenSessionAutoOpenFired = useRef(false)
  useEffect(() => {
    /* A lead who only manages has no session of her own to auto-open - `viewerChecksIn`, not
       `viewerIsAParty`, the same distinction the tab and header button below now make. */
    if (tab !== 'chat' || !viewerChecksIn) return
    /* A conversation named in the address is the one drawn; nothing else is opened over it. The exception is her own open check-in, named by
       the "Start it" on Today (fix plan 16 November, group 9): pressing it is her choosing, so it opens rather than showing a blank tab. */
    const named = searchParams.get('c')
    const startedFromToday = !!named && named === (myOpenCheckIn as any)?.id
    if (named && !startedFromToday) return
    if (!startedFromToday && theLeadChecksInWhenSheChooses && (myOpenCheckIn as any)?.status !== 'IN_PROGRESS') return
    if (myOpenSessionAutoOpenFired.current) return
    if (!myOpenCheckIn || myOpenOpensLater) return
    /*
     * B-009: NOTHING CAN OPEN WHILE AN ADMIN HAS NOT YET ACCEPTED THIS CHECK-IN.
     *
     * The "Waiting for an admin to accept this check-in" callout above already says "You can keep
     * editing it, and nobody can be invited until it is accepted" - but this effect tried to open
     * the lead's own session anyway, the server refused with its own "This check-in is closed.
     * Nothing further can be added." (the sentence written for a check-in that has actually ended),
     * and that refusal banner then sat directly under the waiting callout, flatly contradicting it.
     * Nothing here can open until it is accepted, so this waits until then.
     */
    if ((ground as any)?.status === 'AWAITING_APPROVAL') return
    /*
     * B-019: THE SAME FALSE "CLOSED" REFUSAL, FOR A GROUND THAT HAS ALREADY ENDED.
     *
     * A ground ended early (the lead stopped it) can still have a row here that is not COMPLETED,
     * so this still tried to open it even though the tab now reads "This check-in has ended" -
     * the server's own "This check-in is closed." toasted on top of that message. Nothing can
     * open once the ground itself has ended.
     */
    if (howItEnded(ground as any)) return
    /*
     * SCREEN FAULT 4: THE ANCHOR'S LEAD NEVER GETS AN ORDINARY FIRST CHECK-IN HERE.
     *
     * In `HELP_TEAM_UNDERSTAND` the lead's own account of the situation is the entry conversation
     * she already had and committed - there is no second, ordinary check-in for her to answer, and
     * auto-opening one sent her straight into a conversation the anchor was never meant to ask of
     * her (request 168 asks the engine to stop creating that check-in at all; until it does, the
     * screen must not walk her into it). She lands on the board instead, same as anyone arriving
     * at a ground with nothing of their own left to open.
     */
    if ((ground as any)?.scenario === 'HELP_TEAM_UNDERSTAND') {
      myOpenSessionAutoOpenFired.current = true
      navigate(`/grounds/${id}/board`, { replace: true })
      return
    }
    myOpenSessionAutoOpenFired.current = true
    /*
     * SCREEN FAULT (engine workspace, 9 October night, test bed copy a): this fires the moment the
     * page lands on the Check-in tab, silently, before the reader has read anything - and the
     * probe it starts can still be pending once she has clicked over to another tab and started
     * something there (Wairimu Njoroge, sending her first message in Context and resources). Its
     * own navigate, landing later, took her back to `/checkin/...` regardless, and her message's
     * reply was lost. `shouldNavigate` is checked right before that navigate fires, against the
     * tab she is actually on then, not the tab she was on when this effect ran - so a silent
     * auto-open from the Check-in tab never pulls her away once she has moved on.
     */
    openMySession(myOpenCheckIn, {
      isFreeGround: (ground as any)?.isFreeGround,
      groundLabel: (ground as any)?.label,
      isInitiator,
      shouldNavigate: () => tabRef.current === 'chat',
    })
  }, [tab, viewerChecksIn, myOpenCheckIn, myOpenOpensLater, openMySession, ground, isInitiator, searchParams])

  /**
   * HAFSAH, 10 OCTOBER: AN ADMIN WHO ONLY READS A CHECK-IN LANDS ON THE BOARD, NOT ON CONTEXT.
   * The tab bar itself already drops Check-in and My work for this reader (see the header
   * below); this catches the default landing tab (`chat`) and a link carrying
   * `?tab=checkins`/`report`/`record`, and sends them to the Board page instead - the page an
   * admin who does not run this check-in is here to read (decision 16, comparison first). This
   * replaces the earlier choice (REVIEW ROUND 3, ITEM 3) to land this reader on Context, which
   * B-143's second deep page audit found confusing: the board, not Context, is what a read-only
   * admin is there for. Context is still reachable, from its own tab.
   *
   * BUG FOUND ON RE-REVIEW: this ran the moment the page mounted, before the check-in had
   * loaded. While `ground` is still undefined, `isInitiator` and `viewerIsAParty` are both
   * their unloaded default of false - indistinguishable from a real read-only admin - so
   * every reader, including the lead and a party arriving on `?tab=chat`, was sent away for
   * an instant. Waiting for the check-in to load before asking who the reader is fixes that:
   * by the time this can fire, the two flags are the server's real answer.
   *
   * GROUP 3'S REVIEW, CONTRADICTION 1: "?tab=report" LANDED SOMEWHERE WITH NO REPORT IN IT.
   * The note under the tabs tells a read-only admin "You can read this check-in's board and
   * reports", which is true - the reports live on the Board page (`/grounds/:id/board`), opened
   * from the Board tab, where each session is listed with an "Open" link to its report. All four
   * of this reader's redirected cases (the default landing, `report`, `checkins` and `myrecord`)
   * now go to the same place: the Board page.
   */
  useEffect(() => {
    if (isLoading || !ground) return
    if (isInitiator || viewerIsAParty) return
    /* B-143 (Hafsah, 10 October): `?tab=checkins` and `?tab=sessions` send this reader to the board too, though for everybody else they
       open People and setup's one list now (page audit, 24 November 2026, row 8). */
    const askedForTheRoster = ['checkins', 'sessions'].includes(searchParams.get('tab') ?? '')
    const inMyWorkGroup = tab === 'myrecord' || askedForTheRoster
    if (tab !== 'report' && tab !== 'chat' && !inMyWorkGroup) return
    navigate(`/grounds/${id}/board`, { replace: true })
  }, [isLoading, ground, isInitiator, viewerIsAParty, tab, id, navigate, searchParams])

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
    (ground as any)?.cadenceDays,
  )

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

  const { data: shareCardData, isLoading: shareCardLoading } = useQuery({
    queryKey: ['contributor-code-share-card', shareCodeId],
    queryFn: () => billingApi.getContributorCodeShareCard(shareCodeId!),
    enabled: !!shareCodeId && shareCodeModalOpen,
    retry: false,
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
    /* The server says whether it went: the same mail is not sent twice in a day, and the lead is told which of the two happened. */
    onSuccess: (res: any) => (res?.sent === false
      ? toast.info('That invitation already went today, so it was not sent a second time. Their link still works.')
      : toast.success('Invite sent again.')),
    onError: () => toast.error('It did not send again. The original invite still works - try again in a moment.'),
  })

  const updateRole = useMutation({
    mutationFn: ({ participantId, role }: { participantId: string; role: string }) =>
      participantsApi.updateRole(participantId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ground', id] })
      toast.success('Role updated')
    },
    onError: () => toast.error('Their role did not change. Nothing else was altered - try again.'),
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
    onError: () => toast.error('Not saved. What you typed is still here - try again.'),
  })

  /**
   * TWO SETTINGS THAT WERE READ IN FOUR PLACES AND WRITTEN BY NOTHING.
   *
   * `whoSeesTargets` decides whether ten colleagues' numbers land on somebody's first screen, and
   * the board and the check-in conversation both read it. `expectThemToUnblock` decides whether a
   * check-in asks what somebody actually tried before recording a blocker, and the conversation
   * reads it. Each had a default and a careful note on the column saying when the other value is
   * right - describing a choice nobody in the product could make.
   *
   * Exactly the state `peersVisibleToEachOther` was in above, which is the point: a column, a
   * reader and no writer compiles clean and passes every test.
   */
  const setOverWhatsApp = useMutation({
    mutationFn: (over: boolean | null) => groundsApi.setOverWhatsApp(id!, over),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ground', id] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change.'),
  })
  const setSimplerWords = useMutation({
    mutationFn: (on: boolean) => groundsApi.setSimplerWords(id!, on),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ground', id] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change.'),
  })
  const setWhoSeesTargets = useMutation({
    mutationFn: (everybody: boolean) => groundsApi.setWhoSeesTargets(id!, everybody),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ground', id] }); toast.success('Saved.') },
    onError: () => toast.error('Not saved. The setting is unchanged - try again.'),
  })

  const setExpectThemToUnblock = useMutation({
    mutationFn: (expect: boolean) => groundsApi.setExpectThemToUnblock(id!, expect),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ground', id] }); toast.success('Saved.') },
    onError: () => toast.error('Not saved. The setting is unchanged - try again.'),
  })

  const setContactVisibility = useMutation({
    mutationFn: (restrict: boolean) => groundsApi.setExternalVisibility(id!, restrict),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ground', id] }),
    onError: () => toast.error('That setting did not change - try again.'),
  })

  /**
   * REMINDERS ("How it runs", People and setup). `PATCH /grounds/:id/chasing` has existed since the
   * chasing cron read these three fields, and nothing on any screen ever wrote to them - built now
   * for CheckInPeopleAndSetup.tsx. Whoever set the check-in up only (the server enforces this).
   */
  const setChasing = useMutation({
    mutationFn: (body: { days?: number[]; stopped?: boolean; tellTheLead?: boolean }) => groundsApi.setChasing(id!, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ground', id] }); toast.success('Saved.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Not saved. The setting is unchanged - try again.'),
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
  /* Colleagues are picked by id and the server finds each address (U.4): the list carries none. */
  async function addManyParticipants(picked: { id: string; name: string }[]) {
    setAddingMany(true)
    let added = 0
    const refused: string[] = []
    const rows: { invitedAt?: string | null; notInvitedBecause?: string | null }[] = []
    for (const person of picked) {
      try {
        const r = (await groundsApi.addParticipant(id!, { colleagueId: person.id })) as { invitedAt?: string | null; notInvitedBecause?: string | null }
        added++
        rows.push(r)
      } catch (err: any) {
        refused.push(`${person.name} could not be added. ${err?.response?.data?.message ?? 'Try again.'}`)
      }
    }
    setAddingMany(false)
    qc.invalidateQueries({ queryKey: ['ground', id] })
    const invited = rows.filter((r) => !!r.invitedAt).length
    if (added) toast.success(added === 1 ? (invited ? 'Added and invited.' : 'Added.') : `${added} people added${invited ? `, ${invited} invited` : ''}.`)
    for (const line of sentencesFor(whyNotInvited(rows))) toast.info(line)
    for (const line of refused) toast.error(line)
  }

  /*
   * THE SETUP WRITES GO THROUGH useMutation LIKE EVERY OTHER WRITER ON THIS PAGE. Five of them called
   * the API as a raw promise from onClick, disabled only by value equality, so a double click before
   * the response fired two identical PATCHes - and timeframe and cadence regenerate the session plan,
   * so a double submit there reshaped the run twice.
   */
  const saveSetup = useMutation({
    mutationFn: (patch: Record<string, unknown>) => groundsApi.update(id!, patch as any),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['ground', id] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change - what you typed is still here, try again.'),
  })
  const setWorkTogether = useMutation({
    mutationFn: (v: boolean) => groundsApi.setPeopleWorkTogether(id!, v),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['ground', id] }) },
    onError: () => toast.error('Not saved. What you typed is still here - try again.'),
  })

  const addParticipantMut = useMutation({
    mutationFn: () => groundsApi.addParticipant(id!, { email: newParticipantEmail.trim(), ...(newParticipantName.trim() ? { displayName: newParticipantName.trim() } : {}), note: newParticipantNote.trim() || undefined, department: newParticipantDepartment.trim() || undefined }),
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
      setNewParticipantName('')
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
    /* Seeded like the rest: an empty picker on a check-in that already skips weekends would offer
       to put it back on Sundays by pressing save. */
    if (Array.isArray(ground?.workingDays)) setWorkingDaysDraft(ground.workingDays as number[])
    setAnchorDayDraft(((ground as any)?.cadenceAnchorDay ?? null) as number | null)
    if (ground?.scenario) setGroundScenario(prev => prev || ground.scenario)
    /* Seeded from the record for the same reason as the two above: an empty date control on a
       check-in that HAS a start date would offer to clear it by pressing save. */
    setStartsAtDraft(startsAtOnRecord)
  }, [ground?.label, ground?.scenario, startsAtOnRecord])

  /*
   * WHETHER SAVE HAS ANYTHING TO SAVE.
   *
   * It compared the length and the rhythm only, so changing the days a team works left the button
   * disabled - the control agreeing with you and doing nothing, which is the family of bug this
   * week. Compared as sets, because the picker sorts and the record may not.
   */
  const sameDays = (a: number[] | null | undefined, b: number[] | null | undefined) =>
    workingDaysOf(a).join(',') === workingDaysOf(b).join(',')
  const theTimeframeChanged = !!ground && (
    timelineDaysDraft !== ground.timelineDays
    || cadenceDraft !== ground.cadence
    || !sameDays(workingDaysDraft, (ground as { workingDays?: number[] }).workingDays)
    || anchorDayDraft !== (((ground as any)?.cadenceAnchorDay ?? null) as number | null)
  )

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
    <Page narrow>
      <Empty title="I could not load this check-in" action={<Button kind="secondary" onClick={() => refetch()} disabled={isFetching}>{isFetching ? 'Trying…' : 'Try again'}</Button>}>
        This is a connection problem, not a lost record. Nothing you have written is affected.
      </Empty>
    </Page>
  )

  if (isLoading) return <Page narrow><Skeleton what="Getting this check-in" shape="lines" /></Page>
  /* Not loading and nothing came back: the address is wrong or this is not yours. "Loading…" forever said neither. */
  if (!ground) return (
    <Page narrow>
      <Empty title="No check-in at this address" action={<Button kind="secondary" onClick={() => navigate('/grounds')}>Back to your check-ins</Button>}>
        The link may be out of date, or this check-in is not one you are in.
      </Empty>
    </Page>
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
      <Page narrow>
        <Empty
          title="This view is for whoever runs this check-in."
          action={(
            <Button kind="secondary" onClick={() => navigate(amAParty ? `/grounds/${id}/p` : '/grounds')}>
              {amAParty ? 'Go to my check-ins' : 'Back to check-ins'}
            </Button>
          )}
        >
          Setting up a check-in, inviting people and releasing the report belong to its lead, or to
          an admin in your organisation. {amAParty
            ? 'Your own check-ins and the record are on your page.'
            : 'You are not in this check-in, so there is nothing here for you.'}
        </Empty>
      </Page>
    )
  }

  /* There is no lead page (10 Sep 2026): a ground is open from the moment it is made, and the person
     leading it goes straight to their check-in like everybody else. */

  /* One source of attention for the header, computed once (fix plan C16): it decides which of three chips may speak. */

  // Every party, every session - not "twelve distinct numbers are complete
  // somewhere". See everySessionDone: the short version closed a ground over a
  // missing closing account.
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
  /*
   * REQUEST 174, ITEM 2 (report tab, fault d): "Session 1 of 12" STUCK WHILE SESSION 2 WAS BEING
   * ANSWERED. This fed every row of `ground.participants` into the rule unfiltered, including
   * somebody held at the organisation's door (`notLetInYet`) - decision 77, the same rule
   * the server's one count already applies for the roster and the counter just below. Someone not let in
   * yet never has a completed session and never will, so their row is permanently empty, which
   * permanently caps "the lowest number anybody has finished" at zero and the header at "Session
   * 1" - whatever everybody actually let in has done. Left out here the same way they are left out
   * of `roundDone`/`total`, so the header reads the same served state the rest of this page does.
   */
  /* The server's clock first (the latest session that has begun, Hafsah, 22 November 2026); the rows only where none was served. */
  const openRoundFromRule = (ground as any).sessionClock?.currentSession ?? whichSessionIsThisCheckInOn(
    /* And nobody invited who has not joined yet (decision 8 redone): their empty row is not the team's place. */
    (ground.participants ?? []).filter((p: any) => !p.notLetInYet && !p.notJoinedYet).map((p: any) =>
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
  /* Counted once, and out here, so the row's own label does not have to reach into the record. */
  const settingsChangeCount = ((ground as any)?.settingsChanges?.length ?? 0) as number

  /*
   * B-012: counting rows, not sessions, read "9 of 6 sessions are done" - a self-correction adds a
   * second COMPLETED row for the same session number (the dots below already know this; `done` and
   * `corrected` are both a completed row for one session), so a session answered once and then
   * corrected was being counted twice. Counting the distinct session numbers fixes it, and
   * `yourSessionsSentence` also clamps to the planned total so this can never again read more done
   * than the check-in has.
   */
  /* How many of her own sessions are done is the server's one count (api grounds/the-sessions-done.ts), the same one People and setup and the board read. */
  const mySessionsDone = servedSetup && servedSetup.on && servedSetup.view !== 'reader' ? servedSetup.yourSessionsDone : 0
  /* One dot per session of mine. The same read the party's page makes - the two views of a check-in
     have to move together, which is what the-two-views-are-a-pair protects. */
  const mySessionDots = ((ground?.checkIns ?? []) as any[])
    .filter((c) => !c.isSetup && (ground?.participants ?? []).some((p: any) => p.id === c.participantId && p.userId === user?.id))
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
   * B-053: ONE SESSION, NAMED ONCE. `ground.sessionClock` (when the server sends it) already names
   * the round its own sentences are about - `says` read "Session 1 of 12." the moment the server's
   * own count disagreed with this page's `openRound` (a lead who does not check in herself holds
   * `openRound` at 1 after finishing session 1, because she is excluded from who-checks-in, while
   * the clock's own round is the one `says` is about). Counting "who has checked in" against this
   * page's own `openRound` then read a different session than the one just named - "Session 1 of
   * 12. ... Nobody has checked in yet. Waiting for the first check-in." over a finished session 1.
   * Whenever the server sends a clock, its own round is the one every count after `says` is about;
   * `openRound` is kept only as the fallback for a ground the server has not given one.
   */
  const clockRound = ground.sessionClock?.currentSession ?? openRound
  /*
   * WHO IS IN THIS SESSION AND WHO HAS ANSWERED IT, FROM THE SERVER'S ONE COUNT (Hafsah, 30 October 2026, first-experience round 1).
   * This page counted on the screen (`whoIsInRound`) while the board and Ask counted their own way, and a field lead read three
   * different counts of one session. The served count's own sentences for the clock's session (api grounds/the-count-as-served.ts),
   * with who it leaves out said beside it. Null where this reader is not shown the others.
   */
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
   *
   * B-064: THE ARITHMETIC ALONE IS NOT EVIDENCE SOMEBODY WAS ADDED. E1 on Riverbank Trading's old
   * data (docs/existing-users-check.md) found "It went back to session 2, because somebody new was
   * added." on check-ins where nobody had been added - the old data simply carried one person much
   * further than another (session 20 against session 2), because it was put in with each person's
   * own stray session numbers rather than everybody starting together. The arithmetic condition
   * above is still necessary (it is what "went back" even means), but it is not sufficient: it is
   * also true of two people who have always been in the check-in and have simply answered a very
   * different number of times. The server does not send a "this person was added after the round
   * opened" flag (request 201 asks for one), so this reads the nearest honest signal already on the
   * page: `createdAt`, when every non-managing participant has one. Only when somebody who is BEHIND
   * joined the check-in later than somebody who is AHEAD could they plausibly be the newcomer the
   * sentence is about; when the data gives no such evidence (old imports often give everybody the
   * same `createdAt`, or none at all), the sentence is dropped rather than guessed.
   */
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
  /* B-053: named against `clockRound`, the same session `ground.sessionClock.says` (when sent) is about -
     see the comment beside `clockRound`'s own declaration. */
  /*
   * NOTHING IS BEING WRITTEN UNTIL SOMEBODY HAS CHECKED IN. Hafsah, 21 Sep 2026, on her own ground: "0 of
   * 1 checked in for session 1 · report being written", after the setup conversation and before any
   * check-in - and she read it as a report on its way. A report row exists from setup; a report is
   * written from check-ins. With none in this session, the header says whose turn it is.
   */
  /**
   * FAULT 6, 6 Oct 2026: THE HEADER HAS TO READ THE SAME STATE AS PEOPLE AND SETUP AND THE SIDEBAR.
   *
   * Both of those read `ground.status` straight (`whatThisStatusMeans` in
   * what-a-status-means-to-the-person-in-it.ts, and `GroundStatusBadge` in AppShell.tsx), so a
   * `REPORT_READY` ground says "The report is ready to read." on People and setup and "Report
   * ready" in the sidebar - while this header worked out its own answer from `ground.report` and
   * the round, with no branch for that status at all, and said "Report being written." instead.
   * Same check-in, three surfaces, two different claims about whether the report is ready.
   *
   * Checked first, ahead of the round-based guesses below: when the server has actually marked
   * the ground `REPORT_READY`, the header says so in the same words, rather than re-deriving a
   * possibly-stale answer from `report`/`everyoneIn`/`roundDone`.
   *
   * FAULT 4 (LIVE RE-WALK): "READY TO READ" IS NOT THE SAME CLAIM AS "SHARED". This read "The
   * report is ready to read." for a `REPORT_READY` ground whatever `releasedAt` said, while People
   * and setup's own "The team's report" row (CheckInPeopleAndSetup.tsx) read "Not shared yet.
   * Share it from the report when it is ready." for that same ground - true, but written as if the
   * report were NOT ready, when it is. Both now distinguish ready-but-not-shared from ready-and-
   * shared, in the same words: "ready to read" only once it is actually released (the one claim
   * both "ready" and "shared" together support); ready but unreleased says so plainly instead.
   */
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
  /* Narrow unless somebody chose otherwise: a default that publishes is not a default. */
  const numbersShared = (ground as any)?.whoSeesTargets === 'EVERYBODY'
  /* On unless somebody turned it off, matching the column. */
  const expectsUnblocking = (ground as any)?.expectThemToUnblock !== false

  /**
   * THE PROTOTYPE'S FIVE TABS, FOLDED FROM TODAY'S SEVEN (docs/tasks-ui.md, the check-in rebuild).
   *
   * `ground-tabs.ts`'s own `groundTabs()` used to be drawn straight into the tab row - "Check-in",
   * "Report", "Sessions", "My record" (if a party), "Context", "Setup" - which is six or seven
   * entries once "Board" is prepended. The prototype's check-in page has five: Board, Check-in,
   * Context, My work, People and setup. `groundTabs()` itself, and its own test suite, are
   * untouched - what changed is only what draws the tab row: Report, Sessions (this page's
   * `checkins`) and What I shared (`myrecord`) are folded under one "My work" tab, as sub-tabs
   * inside it, and Setup is relabelled "People and setup" (unfolded; it was already its own tab).
   *
   * ONE MOVE LIST:
   *   Report            -> My work (sub-tab "Report")
   *   Sessions           -> My work (sub-tab "Sessions", lead only)
   *   What I shared       -> My work (sub-tab "What I shared", a party only)
   *   Setup              -> People and setup (unchanged content, new label)
   */
  const inMyWork = (['report', 'myrecord'] as Tab[]).includes(tab)
  /**
   * FAULT 3: "MY WORK" HAS TO LAND IN THE SAME PLACE, HOWEVER IT WAS REACHED.
   *
   * My work is the B7 page (MyWorkPage.tsx) for the lead and for each person in the check-in, so this tab row, the board's,
   * the report pages' (`checkInHeaderTabs` in ground-tabs.ts) and `?tab=mywork` all land on `myrecord`. "Every session" and
   * "Who has answered" stay one press away inside it, and `?tab=sessions` still opens the roster directly.
   */
  const myWorkDefault: Tab = 'myrecord'
  const outerTabOf = (t: Tab): string => {
    if (t === 'chat') return 'checkin'
    if (t === 'docs') return 'context'
    if (t === 'settings') return 'people'
    return 'mywork'
  }

  /**
   * ROUND 4, ITEM A STEP 2: "WHO IS IN THIS", COMPUTED ONCE, FOR People and setup.
   *
   * Exactly the values GroundChat used to compute inline for GroundTopic - moved up here,
   * unchanged, so People and setup (in the Setup tab, below) reads the same roster GroundChat's
   * Check-in tab used to show. See the comments at each of these call sites, kept there rather than
   * repeated here.
   */
  /*
    PEERS ARE NOT HIDDEN FROM WHOEVER RUNS THE CHECK-IN.

    `peersVisibleEffective` is the rule between the PARTIES - on an evaluation-family ground they
    check in without seeing each other. Passed straight through, this view showed a lead or an org
    admin the party sentence: "Your lead knows who is here; you will not see the others or what
    they wrote, and they will not see you." Said to an admin, on a page that lists both parties by
    name and email on the very next tab, and whose own banner reads "You can see everything here,
    which is the point of being an admin". Found walking a second admin of a real organisation.

    The rule has not changed for anybody it applies to. This view is the one that runs the
    check-in, so it is not one of them.
  */
  /* Issue 65 (7 November 2026): the only sentence this now draws is "People on this check-in answer without seeing each other. You can
     see who is here.", which is true for whoever runs it and for an admin, so the lead of a hidden check-in reads it too. */
  const whoIsInThisPeersHidden = (ground as any).peersVisibleEffective === false
  /* NOBODY IS LATE FOR A SESSION THAT HAS NOT OPENED. W14-12. `myOpenCheckInId`/`myNextOpensAt`
     computed once, above, near myOpenCheckIn/myOpenOpensLater - see
     people-and-setup-as-each-reader-reads-it.spec.tsx, which pins this exact derivation as a source check.
     Passed to CheckInPeopleAndSetup.tsx, whose roster rows read it. */
  const whoIsInThisNotOpenYet = !myOpenCheckInId && !!myNextOpensAt
  const whoIsInThisLeadName = (() => {
    const lead = (ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR')
    return lead ? personLabel(lead) : null
  })()
  const whoIsInThisParties = (ground.participants ?? [])
    .filter((p: any) => !p.managingOnly)
    .map((p: any) => {
      /* The session the header names and counts (`clockRound`, the server's own clock), so a row never says "You have not
         checked in for this session yet" about a different session than the header's count (Hafsah, 30 October 2026). */
      const current = clockRound
      const theirs = ((ground.checkIns ?? []) as any[]).filter((c) => c.participantId === p.id)
      return {
        /* Carried for every reader. CheckInPeopleAndSetup's roster matches its own rows to this by `id`, so it can fold the
           session-completion fact into a row that already has the person's own label (no name of its own: issue 66). */
        id: p.id as string,
        done: hasDoneThisSession(theirs, current),
        isSelf: p.userId === user?.id,
        /* GROUP 3'S REVIEW, CONTRADICTION 4: held outside the organisation, by an admin - not by
           the session's own clock. Read with `p?.` (not
           `p.`) only so this is not a second match for waiting-on-your-org-is-not-waiting-on-them
           .spec.ts's check that "Invite pending" is decided before this field is - that rule is
           about the roster row below, not this one. */
        waitingToBeLetIn: !!p?.user?.awaitingOrgApproval,
        notJoinedYet: !!(p as any)?.notJoinedYet,
      }
    })

  return (
    <div className="gwui-page-shell">
      {/*
        HAFSAH, 30 SEPTEMBER, THE SETTING ROW, ITEM 3: THE SHARED PAGE FRAME, NOT A NARROWER ONE OF
        THIS PAGE'S OWN.

        This used to wrap the header (and, further down, the "People and setup" tab's own body) in
        a hand-rolled `maxWidth: 1060, margin: '0 auto'` div - a leftover from before the board
        itself moved onto the real shared `Page` (components/gw/ui/Page.tsx). Measured at 1440px,
        that put this page's content at about 315 to 1375 - narrower, and shifted right, against
        the board's own frame (using `Page`) at about 304 to 1386. `Page` is what the board, and
        every other rebuilt page, actually use for their outer frame; this page now uses the same
        one, rather than a second, slightly different copy of its numbers.
      */}
      <Page>
        <CheckInHeader
          crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label: ground.label }]}
          title={ground.label}
          subtitle={(ground as any).cadence ? (theRhythmInFull(ground as any, { untilEnded: !!(ground as any).runsUntilEnded }) ?? `${cadenceLabel((ground as any).cadence, (ground as any).cadenceDays)}.`) : undefined}
          action={(
            <div>
              {/*
                ROUND 5, ITEM H1: ONLY OFFERED TO SOMEBODY WHO ANSWERS IT.
                "Your check-in" (board-as-lead.txt) is the same place the Check-in tab opens - which,
                for an admin who is not a party, is now the plain line telling her she does not
                answer this check-in (GroundAdminPage's own tab === 'chat' branch). Offering the
                button anyway would promise a check-in that tab does not have for her.

                HAFSAH, 30 SEPTEMBER, ITEM 4: NOT ON PEOPLE AND SETUP.
                The prototype draws this button on Board, Context (context.jpg) and My work
                (sessions.txt), but check-in-people-and-setup.txt has no "Your check-in" before its
                tabs - only "Add people" is navy on that screen. Without this, the People and setup
                tab carried two navy buttons at once ("Your check-in" here, "Add people" further
                down); the prototype's own screen has exactly one.

                COORDINATOR FOLLOW-UP: NOT FOR A LEAD WHO ONLY MANAGES EITHER. She is a party
                (`viewerIsAParty`), but never answers a round of her own - `viewerChecksIn` is the
                same distinction `participantsWhoCheckIn` already draws for every count on the
                Check-ins tab. Offering this button promised a check-in she does not do.

                B-234: NOT WHILE STALLED, EITHER. With no `myOpenCheckInId` (nothing can open while
                the check-in has stalled), pressing this just called `goTab('chat')` while already
                on the Check-in tab - no request, nothing a reader could see change. Dov's own
                "Start my check-in" is withheld the same way once a check-in has stalled
                (GroundParticipantPage.tsx, B-215 review 6); Mira's own Check-in tab already shows
                the amber "Out of time" box with "Give it more time" beside it, so this button has
                nothing left to do.
              */}
              {viewerChecksIn && outerTabOf(tab) !== 'people' && !hasStalled(ground.status) && (
                /*
                 * RE-REVIEW: THIS LINKED TO THE BARE GROUND PAGE, NOT TO A CHECK-IN.
                 * `/grounds/:id` is this very page - clicking it while already here did
                 * nothing a reader could see. It should open the reader's own open session
                 * directly (`/checkin/:id`), the same place the Check-in tab's effect above
                 * sends her, or land on the Check-in tab when she has none open right now.
                 */
                <Button
                  size="small"
                  onClick={() => {
                    goTab('chat')
                  }}
                >
                  Your check-in
                </Button>
              )}
              {/*
                HAFSAH, 30 SEPTEMBER, ITEM 4: NOT HERE EITHER. "Ask" only sits in the header on the
                board (board-as-lead.txt) - context.txt, sessions.txt and check-in-people-and-
                setup.txt all carry the tabs with no "Ask" beside them. This page never renders the
                Board tab itself (BoardPage.tsx does, with its own "Ask", already in place), so its
                own header never needs one.
              */}
            </div>
          )}
          active={outerTabOf(tab)}
          tabs={
            /**
             * REVIEW ROUND 3, ITEM 3: THREE TABS FOR AN ADMIN WHO DOES NOT RUN THIS CHECK-IN AND
             * IS NOT A PARTY TO IT EITHER - the prototype's read-only view (A4,
             * read-only-view.jpg/.txt): Board, Context, People and setup. No Check-in (there is
             * none of theirs to answer) and no My work (nothing of theirs to carry). An admin who
             * IS also a party keeps the full row - they have their own check-in like anybody else.
             *
             * Filtered from ONE list (not two literal arrays) so "/board`" - which
             * one-door-per-place.spec.ts pins at an exact count - still appears once here, not
             * once per branch.
             *
             * COORDINATOR FOLLOW-UP: "CHECK-IN" IS ALSO NOT FOR A LEAD WHO ONLY MANAGES. She is
             * `isInitiator`, so the general condition below never dropped it for her - but she has
             * no check-in of her own to answer, same as the admin the comment above already
             * excludes it for. This one tab reads `viewerChecksIn` on its own; every other tab
             * keeps the existing rule.
             */
            [
              /* No Board tab for a check-in the server says has no board (Hafsah, 15 November 2026): nobody is sent to a page that only points elsewhere. */
              ...((ground as any).boardRenders === false ? [] : [{ key: 'board', label: 'Board', to: `/grounds/${id}/board` }]),
              { key: 'checkin', label: 'Check-in' },
              { key: 'context', label: REFERENCES_AND_RESOURCES },
              { key: 'mywork', label: 'My work' },
              { key: 'people', label: 'People and setup' },
            ].filter(t => t.key === 'checkin'
              ? viewerChecksIn
              : (isInitiator || viewerIsAParty) || (t.key === 'board' || t.key === 'context' || t.key === 'people'))
          }
          onSelectTab={(k) => {
            if (k === 'checkin') goTab('chat')
            else if (k === 'context') goTab('docs')
            else if (k === 'mywork') goTab(inMyWork ? tab : myWorkDefault)
            else if (k === 'people') goTab('settings')
          }}
        />
        {/*
          ROUND 5, ITEM H1: ONE NOTE, NOT TWO. This page used to say "you are not the lead" twice -
          this small plain line, and a separate blue box further down repeating the same fact in
          more words. The prototype's own admin sentence (read-only-view.txt, A4): "You can read
          this check-in's board and reports. Wairimu Kamau runs it." - plain text under the tabs,
          not a callout - so that is what says it now, once, here. The old blue box (and its own
          history: it used to read `lead.email`, which is always null for the only people who see
          it, and fell back to the broken fragment "its lead runs this check-in.") is gone with it.
        */}
        {!isInitiator && (
          <Note>
            You can read this check-in’s board and reports. {(() => {
              const lead = (ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR')
              const first = (lead?.user?.firstName ?? '').trim()
              const last = (lead?.user?.lastName ?? '').trim()
              const name = [first, last].filter(Boolean).join(' ')
              return name || 'Its lead'
            })()} runs it.
          </Note>
        )}

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
        {/*
          REVIEW ROUND 3, ITEM 3: NOT FOR A NON-RUNNING ADMIN.
          The prototype's read-only view carries one sentence ("You can read this check-in's
          board and reports. <lead> runs it.") and nothing else the lead reads about running it -
          not "2 of the 6 have not answered yet.", not the session line, not "How to run one".
          Both this attention line and the session-line paragraph further down are wrapped on
          `isInitiator` now; an org admin who is not the lead still sees the one sentence above.
        */}
        {/* The prototype draws nothing between the tabs and a tab's own content: these three lines belong to the check-in itself, so they sit on the Check-in tab only (B8 has "Give it more time" under When it runs). */}
        {/*
          IT RAN OUT OF TIME, AND HERE IS WHAT LIFTS IT.

          Nate Peterson, 23 September 2026: "i let a few check-ins wait and they are now stalled,
          with no clear way to open them back up. i can't easily see where to reopen them or to
          extend the timeline." There was no reopen anywhere in the product, and the only thing any
          screen said about it was "Ended without an agreed outcome" - a verdict, in green, on the
          one state somebody could still have done something about.

          So it says what happened, in a sentence, and the button goes to the control that lifts it.
          For anybody who cannot change the time, it says whose call it is instead of showing a
          button they cannot press.
        */}
        {/*
          AND THE RISK OF IT, BEFORE IT HAPPENS.

          "have a risk of stalling show, don't just stall." Same banner, same button, one week
          earlier - which is the only version of this that helps anybody. It names what running out
          costs and how many people have still not answered, because the decision it is asking for
          is whether those people still will.
        */}
        {/* On every tab, as "Out of time" below is, so a lead who lands on the board sees that the check-in is about to run
            out (restored, 30 October 2026: it was on the Check-in tab only). */}
        {(() => {
          const left = whenItRunsOut(ground as any)
          if (left.state === 'fine') return null
          const said = sayHowLongIsLeft(left, ground.overdue ?? 0)
          return (
            <Stack gap={10}>
              <Callout tone="warning" title={left.state === 'out' ? 'Time is up' : left.daysLeft === 1 ? 'Runs out tomorrow' : `Runs out in ${left.daysLeft} days`}>
                {said}
              </Callout>
              {ground.viewerRunsThisGround && (
                <Button kind="secondary" size="small" onClick={() => { goTab('settings'); setOpenTimeframe(true); scrollToId('how-long-this-runs') }}>
                  Give it more time
                </Button>
              )}
            </Stack>
          )
        })()}
        {hasStalled(ground.status) && (
          <Stack gap={10}>
            <Callout tone="warning" title="Out of time">
              {itRanOutOfTime(!!ground.viewerRunsThisGround)}
            </Callout>
            {ground.viewerRunsThisGround && (
              <Button
                kind="secondary"
                size="small"
                onClick={() => {
                  goTab('settings')
                  setOpenTimeframe(true)
                  /* Through the one helper - see lib/scroll-to, which exists because a raw smooth
                     scroll ignores reduced-motion and fights the page's own scroll container. */
                  scrollToId('how-long-this-runs')
                }}
              >
                Give it more time
              </Button>
            )}
          </Stack>
        )}
        {/*
          U.10 PICTURE-CHECK ROUND 7, ITEM 3: ONE OR TWO PLAIN SENTENCES, LIKE THE BOARD'S.

          "Set goals and keep the team on track | Session 1 of 12 | How to run one | Ends 13 Dec
          2026 | 4 of 6 checked in for session 1" was five things joined by pipes and pills, not
          sentences a person reads. This says the same facts (minus the scenario/resolution pills,
          which the board's own header does not carry either) as one flowing paragraph - "Session 1
          of 12. It ends on 13 December 2026. 4 of 6 people have checked in for session 1." - with
          "How to run one" kept as its own link rather than a piece of the sentence.
        */}
        {/* REVIEW ROUND 3, ITEM 3: THE SESSION LINE (AND "How to run one") IS NOT FOR A
            NON-RUNNING ADMIN EITHER - same rule as the attention line above. */}

        {/*
          U.10 PICTURE-CHECK ROUND 6, ITEM I: THE TAB ROW MOVED TO THE TOP OF THE HEADER.
          `<GroundTabRow>` used to draw here, at the foot of all the status content above. It is
          now `CheckInHeader`'s own tab bar (components/gw/ui/CheckInHeader.tsx), at the top of
          this sticky header - the prototype's own shape, header then tabs then everything else,
          rather than everything else then tabs.
        */}

      {/*
        ONLY THE CONVERSATION KEEPS A NARROW, CENTRED COLUMN.
        GROUP 3 REVIEW, BATCH B: every tab here used to sit in a 600px column under a full-width
        header, with only "People and setup" drawn at the page's own width. But the prototype's
        own sessions.jpg (the list of sessions, this page's "report" tab) and context.jpg (this
        page's "Context" tab, `docs`) both draw at the page's full width too - as does my-record.jpg
        ("My work", this page's `myrecord`/`checkins`). The one screen the prototype itself narrows
        is the check-in's own conversation (check-in-start.jpg): that is `chat` here, and it alone
        keeps the 600px reading width, centred under the full-width header.
      */}
      <div
        /* Every tab but the conversation takes the page's one content width (--ds-content, 1150px). */
        className={`gw-bd${tab === 'chat' ? ' gwui-ci-tab-body' : ' ds-page-in'}`}
      >

        {/* OVERVIEW */}
        {/*
          THE PERSON WHO SET IT UP HAS TO KNOW WHAT IT IS WAITING FOR. W9-7.
          
          Holding the invites is right, and silently holding them is not: without this
          the creator sees a ground that looks finished, adds somebody, and gets a
          refusal with no explanation of who has to act.
        */}
        {/* An admin who is not its lead decides here, instead of reading the lead's banner (U.5 review). */}
        {(ground as any).status === 'AWAITING_APPROVAL' && isOrgAdmin && !isInitiator && (
          <AnAdminDecidesWhetherItStarts
            groundId={id!}
            setUpBy={(() => {
              const lead = (ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR') as any
              return ([lead?.user?.firstName, lead?.user?.lastName].filter(Boolean).join(' ').trim() || lead?.nameGiven?.trim()) || null
            })()}
          />
        )}
        {(ground as any).status === 'AWAITING_APPROVAL' && !(isOrgAdmin && !isInitiator) && (
          <Callout tone="warning" title="Waiting for an admin to accept this check-in">
            You can keep editing it, and nobody can be invited until it is accepted, so nobody
            has been contacted and nothing has been shared. An admin in your organisation sees it
            on their check-ins page.
          </Callout>
        )}

        {/*
          WHO WAS NOT INVITED, said on the page the admin actually lands on.
          
          Adding people happens one call at a time, so a refusal for one of them — a seat limit, an
          address already on the check-in — was a toast on the wizard, which the admin is navigated
          away from a moment later. Their list of five became three and this page said nothing about
          it, so they left believing everybody had been asked. See who-was-not-invited.ts.
        */}
        {id && <TheyWereNotInvited groundId={id} />}

        {/* CHECK-INS */}
        {/**
          * ROUND 4, ITEM A STEP 3: THE CHECK-IN TAB IS THE FOCUSED CONVERSATION, FOR A PARTY.
          *
          * For a party the `useEffect` above (right after `viewerIsAParty`) has already sent her
          * to `/checkin/:id` or the `?open=1` hand-off by the time anybody would see this render -
          * this is only ever seen for the instant before that navigation lands. For a lead or org
          * admin who is NOT a party, there is no check-in of theirs to answer: `GroundChat`'s
          * read-only history used to stand in for that; it is retired now that the history it drew
          * lives on My work and the roster it drew lives on People and setup, so this says plainly
          * that this reader does not answer the check-in, and links to the board instead.
          *
          * COORDINATOR FOLLOW-UP: THE SAME IS TRUE OF A LEAD WHO ONLY MANAGES. She is a party
          * (`viewerIsAParty`), but has no check-in of her own either - reading `viewerChecksIn`
          * here means she gets this same plain sentence and link, rather than "No check-in open
          * right now" for a check-in she was never going to have.
          */}
        {/*
          THE CHECK-IN TAB DRAWS THE CONVERSATION ITSELF (batch 2, group 5; Hafsah, items 3b, 42
          and 53). If her check-in is open, its conversation is here, ready to type; if not, her
          last one, with the box under it. The page in between ("Check in yourself", "Add context",
          "See what each person said", the session list) is gone; every session is in My work and
          the Report tab, and the tabs stay on screen.
        */}
        {tab === 'chat' && (() => {
          const ended = hasStalled(ground.status) || !!howItEnded(ground as any)
          const myRows = ((ground?.checkIns ?? []) as any[]).filter((c) => c.participantId === myParticipantId)
          const lastFinished = myRows.filter((c) => c.status === 'COMPLETED').sort((x, y) => (y.sessionNumber ?? 0) - (x.sessionNumber ?? 0))[0] ?? null
          /* Decision 133: after her first, the lead checks in when she chooses, so nothing is opened for her unless she has started. */
          const choosing = theLeadChecksInWhenSheChooses && (myOpenCheckIn as any)?.status !== 'IN_PROGRESS'
          const due = viewerChecksIn && !ended && !!myOpenCheckIn && !myOpenOpensLater && !choosing
          const showing: string | null = searchParams.get('c') ?? (due ? null : lastFinished?.id ?? null)
          /* Decision 133: the lead checks in when she chooses, so her box starts her check-in rather than adding a note. */
          const lead = isInitiator
          const firstClosing = isInitiator && theFirstClosing ? (() => {
            const c = theClosingAfterYourFirstCheckIn(ground as any)
            return (
              <p data-testid="the-leads-first-closing" className="gwui-panel-text">
                {c.before}
                <button type="button" className="gwui-plain-link" onClick={() => goTab('settings')}>{c.link}</button>
                {c.after}
              </p>
            )
          })() : null
          /* B-215: a stalled check-in was not decided by anybody, and the lead can still give it more time. Once it has ended or
             stalled, this is the line under the last conversation, in place of the next one's. */
          const endedNote = !ended ? null : hasStalled(ground.status) ? (
              <Callout tone="info">
                You can read what happened so far on the <Link className="gwui-plain-link" to={`/grounds/${id}/board`}>board</Link>.
              </Callout>
            ) : (
              <Callout tone="info" title={howItEnded(ground as any) ?? undefined}>
                <Link className="gwui-plain-link" to={`/grounds/${id}/board`}>Go to the board</Link> to read how it ended and why.
              </Callout>
            )
          if (ended && !showing) return endedNote
          if (showing) {
            return (
              <>
                {firstClosing}
                <ChatPage
                  key={showing}
                  checkInId={showing}
                  groundId={id}
                  settled={endedNote ?? <UntilTheNextOne groundId={id!} myCheckIns={myRows} theLeadChecksInWhenSheChooses={lead} />}
                />
              </>
            )
          }
          if (due) {
            return myOpenSessionFailed ? (
              <Note>
                {myOpenSessionError}{' '}
                <Button kind="quiet" size="small" onClick={() => { retryMyOpenSession(); openMySession(myOpenCheckIn, { isFreeGround: (ground as any)?.isFreeGround, groundLabel: (ground as any)?.label, isInitiator }) }}>
                  Try again
                </Button>
              </Note>
            ) : (
              <Note>{GETTING_YOUR_FIRST_QUESTION_READY}</Note>
            )
          }
          if (lead) return <UntilTheNextOne groundId={id!} myCheckIns={myRows} theLeadChecksInWhenSheChooses />
          if (viewerChecksIn) {
            return (
              <BetweenCheckIns
                groundLabel={(ground as any)?.label}
                myCheckIns={myRows}
                groundId={id!}
                canChangeTheRhythm={false}
                onGoToSetup={() => goTab('settings')}
              />
            )
          }
          return (
            <Panel>
              <Stack gap={10}>
                <p className="gwui-panel-text">
                  You do not answer this check-in yourself. The board shows what has come from it so far.
                </p>
                <Link className="gwui-plain-link" to={`/grounds/${id}/board`}>Go to the board</Link>
              </Stack>
            </Panel>
          )
        })()}

        {/**
          * "MY WORK", FOLDED FROM THREE OLD TABS (Report, Sessions, What I shared).
          *
          * The prototype's my-record.txt and sessions screens hold these as one tab, not three -
          * so this sub-tab row is what a click on the outer "My work" tab actually lands inside.
          * Report is the whole check-in; Sessions is everyone's state, for whoever runs it; What I
          * shared is a party's own account. Same content as before the fold, just reached one
          * level down.
          */}
        {/*
          REVIEW ROUND 3, "YOUR WORK" REBUILD: NO SUB-TAB ROW ANY MORE. The prototype's
          my-record.txt has no sub-tabs at all; "Report", "Sessions" and "What I shared" are
          reached from quiet links inside `YourWork` now (see its `onSeeEverySession`/
          `onSeeRoster`), or by landing on "My work" itself, which always shows the flat page.
        */}

        {/**
          * GATED ON BEING IN IT, NOT ONLY ON THE TAB BEING OFFERED.
          *
          * A party check, not only the sub-tab above being offered: `?tab=record` in the address
          * bar reaches this branch directly. An admin who is not in the check-in would have got two
          * empty panels about a record they do not have.
          *
          * No data was ever at risk: both reads are gated the same way, and the server refuses them
          * independently. This is so the screen does not offer somebody a page about themselves
          * that cannot be about them.
          */}
        {/*
          AN ADMIN WHO IS NOT A PARTY HAS NO "Your work" TO SHOW.
          `YourWork` never mounts for her (it is gated on `viewerIsAParty` below, unchanged from
          before this round), so the two quiet links inside it - "Every session", "Who has
          answered" - never render either. A lead who only manages gets both as their own row
          under her B7 page instead (the `isInitiator && !viewerIsAParty` row below), so both stay
          reachable.
        */}
        {/* On the roster or every session, the way back to My work (the B7 page, see `myWorkDefault` above) and to the other. */}
        {inMyWork && tab !== 'myrecord' && (
          <div className="gwui-button-row">
            {isInitiator && tab !== 'report' && <button type="button" className="gwui-plain-link" onClick={() => goTab('report')}>Every check-in</button>}
            {isInitiator && <button type="button" className="gwui-plain-link" onClick={() => goTab('settings')}>Who has answered</button>}
            {isInitiator
              ? <button type="button" className="gwui-plain-link" onClick={() => goTab('myrecord')}>Each person’s work</button>
              : viewerIsAParty && <button type="button" className="gwui-plain-link" onClick={() => goTab('myrecord')}>Your own record</button>}
          </div>
        )}

        {/* My work is the B7 page, served by the server to the lead for any person in it and to a person for themselves
            (MyWorkPage.tsx), with the rest of today's page and the parts that left References and resources under it. */}
        {tab === 'myrecord' && (isInitiator || viewerIsAParty) && (
          <MyWorkPage
            groundId={id!}
            onAllYourReports={() => goTab('report')}
            /* Everyone this page draws My work for (the lead, or a party on the page that runs it) had these two links before the
               rebuild: a party through YourWork, the lead who does not check in as a row of her own. Both get them here. */
            onEveryCheckIn={() => goTab('report')}
            onWhoHasAnswered={() => goTab('settings')}
            rest={(part, self) => (
              <>
                {/* Every check-in and Who has answered are the lead's, drawn by MyWorkPage in the Your check-ins card. */}
                {(part === 'expected' || part === 'all') && <ContextPage ground={ground} role={isInitiator ? 'lead' : canRunThisGround ? 'admin' : 'party'} viewerUserId={user?.id} only="what-moved-to-my-work" />}
                {self && <>{viewerIsAParty && (
          <YourWork
            groundId={id!}
            ground={ground}
            myRecord={myRecord}
            mySoloReport={mySoloReport}
            refetchSoloReport={refetchSoloReport}
            specificity={mySpecificity}
            /* The lead's page does not fetch the shared report - see the note this replaced
               ("corroborated"/"documentBackedPct" read null for the same reason). */
            report={null}
            totalSessions={plannedSessions ?? null}
            completedCount={mySessionsDone}
            myFinishedSessions={mySessions}
            sessionDots={mySessionDots}
            myParticipant={myParticipant}
            /* GROUP 3'S REVIEW, BATCH A FAULT 6: see the matching note on GroundParticipantPage.tsx. */
            myName={myParticipant ? personLabel(myParticipant) : null}
            leadFirstName={(ground as any)?.leadFirstName}
            otherParties={(ground.participants ?? [])
              .filter((p: any) => p.userId !== user?.id)
              .map((p: any) => ({ id: p.id, name: personLabel(p), email: p.email }))}
            aTeamReportComes={!!(ground as any)?.aTeamReportComes}
            asTheRestOfMyWork
            part={part}
          />
                )}</>}
              </>
            )}
          />
        )}

        {/* WHO HAS ANSWERED is People and setup's one list of people now (page audit, 24 November 2026, row 8): `?tab=sessions` lands there. */}

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
          `role`. RE-REVIEW, HAFSAH'S ITEM 31.2: the brief itself is no longer rewritable by an
          admin either - only the check-in's own lead may change what it says it is for; an admin
          still reads it, like everybody else in the check-in.
        */}
        {tab === 'docs' && <ReferencesAndResourcesPage groundId={id ?? ''} ground={ground} isTheLead={isInitiator} />}

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
          <Stack gap={18}>
            {/* A shared report needs two people; a check-in with one on it says so here rather than "forming" for ever (B17). */}
            {/* Read from the server's `atLeastTwoInThisRound`, as the participant's page reads it. */}
            {!(ground as any).atLeastTwoInThisRound && (
              <Callout tone="warning" role="status">
                The shared report compares two accounts. Add somebody and this will build.{' '}
                <button type="button" className="gwui-plain-link" onClick={() => setTab('settings')}>Add a person</button>
              </Callout>
            )}
            {/* What success looks like is deliberately NOT here - see the note in
                SharedReportForAParty, which carried the same block and lost it for the same
                reason. This tab is an index; the band renders where it can say something. */}
            <TheReportIsAListOfSessions
              rows={sessionRows}
              boardRenders={!!(ground as any).boardRenders}
              onOpenBoard={() => navigate(`/grounds/${ground.id}/board`)}
              onOpenSession={(n: number) => navigate(`/grounds/${ground.id}/session/${n}`)}
              onOpenWeek={() => navigate(`/grounds/${ground.id}/report/week`)}
            />

            {/*
              THE LEAD'S ONE PRESS TO GET THIS ROUND'S REPORT TO EVERYONE WHO ASKED FOR IT.
              GROUP 3 REVIEW, BATCH B: moved below "Every session", where it now reads as a short
              line rather than a card above the heading - sessions.jpg has no such card, and this
              screen's one navy button is the header's own "Your check-in".
            */}
            {isInitiator && (
              <SendTheReportToEveryone
                groundId={id!}
                participants={(ground.participants ?? []) as any[]}
                answered={new Set(((ground.checkIns ?? []) as any[]).filter((c) => c.status === 'COMPLETED' && c.sessionNumber === Math.max(1, roundDone > 0 ? openRound : openRound - 1)).map((c) => c.participantId))}
              />
            )}

            {/*
              RELEASING, AS ONE LINE RATHER THAN THE HEADLINE ACTION.

              "Not sure what release report is for." Fair - in the normal path nobody presses it.
              It fires by itself the moment the last person finishes: everybody is emailed, the
              report is stamped released, and each person's follow-up guide is written. The button
              exists only to cut a session short and publish what there is, so it says that, and it
              only appears while a session is genuinely open.

              "SESSION", NOT "ROUND" (real-user walk, Kijani Foods, fault 2), and two full sentences
              in place of the one joined with a semicolon.
            */}
            {/* Folded, under the board and the session list: it is the exception, not the page. */}
            {isInitiator && (ground as any).report && !(ground as any).report.releasedAt && (
              <Folded summary="Closing a check-in early">
                <Note>
                  When the last person answers, the report goes out to everybody on its own - you do
                  not have to do anything. If you need to stop waiting, you can close this check-in
                  now and publish what there is. It will be missing whoever has not answered.
                </Note>
                {!showReleaseConfirm ? (
                  <Stack gap={10}>
                    <Button kind="quiet" size="small" onClick={() => setShowReleaseConfirm(true)}>
                      Close this check-in now and publish what there is
                    </Button>
                  </Stack>
                ) : (
                  <Stack gap={10}>
                    <Callout tone="warning">
                      {/* "Everybody reads the same thing at the same moment" was here and is not
                          true: everyone is emailed, but each person has to show theirs before they
                          can read it, and the lead does not. A false reassurance in the
                          confirmation for something that cannot be undone. */}
                      Everybody is emailed. This cannot be undone, and
                      anybody who has not answered loses their turn on this check-in.
                    </Callout>
                    <div className="gwui-button-row">
                      <Button kind="secondary" redText size="small" disabled={releaseReport.isPending} onClick={() => releaseReport.mutate()}>
                        {releaseReport.isPending ? 'Publishing…' : 'Publish it now'}
                      </Button>
                      <Button kind="quiet" size="small" onClick={() => setShowReleaseConfirm(false)}>
                        Keep waiting
                      </Button>
                    </div>
                  </Stack>
                )}
              </Folded>
            )}
          </Stack>
        )}

        {/* SETTINGS: "People and setup", rebuilt from components/gw/ui - see CheckInPeopleAndSetup.tsx. */}
        {tab === 'settings' && (
          <CheckInPeopleAndSetup
            ground={ground}
            user={user}
            /* Each person's card, with the lead's note and "Change this in the chat", and what people are down as doing: moved here
               from My work, where a member's page repeated the whole team (Hafsah, 24 November 2026). Whoever runs the check-in reads them. */
            eachPerson={isInitiator || canRunThisGround
              ? (participantId: string) => <ContextPage ground={ground} role={isInitiator ? 'lead' : 'admin'} viewerUserId={user?.id} only="each-person" person={participantId} />
              : undefined}
            downAsDoing={isInitiator || canRunThisGround
              ? <ContextPage ground={ground} role={isInitiator ? 'lead' : 'admin'} viewerUserId={user?.id} only="down-as-doing" />
              : undefined}
            id={id!}
            navigate={navigate}
            isInitiator={isInitiator}
            isOrgAdmin={isOrgAdmin}
            viewerIsAParty={viewerIsAParty}
            mySessionsDone={mySessionsDone}
            plannedSessions={plannedSessions}
            colleagues={colleagues}
            addingMany={addingMany}
            addManyParticipants={addManyParticipants}
            newParticipantEmail={newParticipantEmail} setNewParticipantEmail={setNewParticipantEmail} newParticipantName={newParticipantName} setNewParticipantName={setNewParticipantName}
            newParticipantNote={newParticipantNote} setNewParticipantNote={setNewParticipantNote}
            newParticipantDepartment={newParticipantDepartment} setNewParticipantDepartment={setNewParticipantDepartment}
            addParticipantMut={addParticipantMut}
            queuedToAdd={queuedToAdd} setQueuedToAdd={setQueuedToAdd}
            inviteTheQueue={inviteTheQueue}
            lastInvitedEmail={lastInvitedEmail} whyItWaits={whyItWaits} lastInviteWaits={lastInviteWaits}
            billingStatus={billingStatus}
            onShareCode={() => { setShareCodeId(id ?? null); setShareCodeModalOpen(true) }}
            whoIsInThisParties={whoIsInThisParties}
            whoIsInThisPeersHidden={whoIsInThisPeersHidden}
            whoIsInThisNotOpenYet={whoIsInThisNotOpenYet}
            whoIsInThisLeadName={whoIsInThisLeadName}
            forceOpenTimeframe={openTimeframe}
            fixingEmailId={fixingEmailId} setFixingEmailId={setFixingEmailId}
            fixingEmailValue={fixingEmailValue} setFixingEmailValue={setFixingEmailValue}
            fixEmail={fixEmail}
            resendInvite={resendInvite}
            updateRole={updateRole}
            settingsChangeCount={settingsChangeCount}
            startsAtDraft={startsAtDraft} setStartsAtDraft={setStartsAtDraft}
            startsAtOnRecord={startsAtOnRecord}
            createdAtOnRecord={(ground as any)?.createdAt ?? null}
            canOfferStartDate={isInitiator && mySessionsDone === 0 && sessionRows.length === 0}
            timelineDaysDraft={timelineDaysDraft} setTimelineDaysDraft={setTimelineDaysDraft}
            cadenceDraft={cadenceDraft} setCadenceDraft={setCadenceDraft}
            workingDaysDraft={workingDaysDraft} setWorkingDaysDraft={setWorkingDaysDraft}
            anchorDayDraft={anchorDayDraft} setAnchorDayDraft={setAnchorDayDraft}
            theTimeframeChanged={theTimeframeChanged}
            saveSetup={saveSetup}
            groundLabel={groundLabel} setGroundLabel={setGroundLabel}
            groundScenario={groundScenario} setGroundScenario={setGroundScenario}
            peersVisible={peersVisible} peersDefaultHidden={peersDefaultHidden} setPeerVisibility={setPeerVisibility}
            contactHidden={contactHidden} setContactVisibility={setContactVisibility}
            numbersShared={numbersShared} setWhoSeesTargets={setWhoSeesTargets}
            whatsAppIsOn={whatsAppIsOn}
            setOverWhatsApp={setOverWhatsApp}
            setSimplerWords={setSimplerWords}
            expectsUnblocking={expectsUnblocking} setExpectThemToUnblock={setExpectThemToUnblock}
            setWorkTogether={setWorkTogether}
            setChasing={setChasing}
            confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
            deleteError={deleteError} setDeleteError={setDeleteError}
            removeGround={removeGround}
          />
        )}
      </div>
      </Page>
      {shareCodeModalOpen && (
        <Modal title="Share an access code" onClose={() => setShareCodeModalOpen(false)}>
          {shareCardLoading && <Skeleton what="Getting this check-in" shape="lines" />}
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
            <Note>No share code available for this check-in.</Note>
          )}
        </Modal>
      )}
      {/* REVIEW ROUND 3, ITEM 2: THE PAYWALL FOR THE LEAD'S OWN SESSION, OPENED FROM THIS PAGE NOW. */}
      <SessionPaywallModal paywall={paywall} canPayHere={canPayForMySession} groundId={id} />
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="gwui-page-shell">{children}</div>
}

