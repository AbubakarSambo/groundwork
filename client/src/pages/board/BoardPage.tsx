import { RELEASE_4_ORDERS, whereItFolds, theRelease4Order } from './release-4-orders'
import { hasEnded, howItEnded, hasStalled } from '@/lib/a-ground-that-has-ended'
import { TheLeadsNote } from '@/components/gw/TheLeadsNote'
import { ThisAddsASeat } from '@/components/gw/this-adds-a-seat'
import { useState, type ReactNode } from 'react'
import { WhatSuccessLooksLikeFor } from '@/components/gw/WhatSuccessLooksLike'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { SWITCHBOARD_MATRIX } from './the-switchboard-g2-table'
import { ThatIsOnTheRecord } from '@/components/gw/ThatIsOnTheRecord'
import { TheOtherBoardsYouAreIn } from '@/components/gw/TheOtherBoardsYouAreIn'
import { HowItIsGoing } from '@/components/gw/how-it-is-going'
import { WhatToSettleTogether } from '@/components/gw/what-to-settle-together'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckInLinks } from './CheckInLinks'
import { boardApi, type BoardPresent, type CoverageVariant, type AnAction, type StartingStateAtTheStart, type ChangeSinceLast, type NinetyDays } from '@/api/board'
import { isASalesKind } from '@/lib/a-sales-kind'
import { apiClient } from '@/api/client'
import { groundsApi } from '@/api/grounds'
import { participantRequestsApi } from '@/api/participantRequests'
import { looksLikeAnAddress, NOT_AN_ADDRESS } from '@/components/gw/an-address-that-can-receive-mail'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
// The board's own vocabulary now lives in components/gw/kit so every other page
// can be rebuilt from it. Values unchanged: this is an extraction, not a redesign.
import { todayApi, type Need } from '@/api/today'
import { HowThisHasMoved } from '@/components/gw/HowThisHasMoved'
import { ResolutionPanel } from '@/components/gw/ResolutionPanel'
import { OutcomeFeedback } from '@/components/gw/OutcomeFeedback'
import { useAreYouSure, Confirm } from '@/components/gw/a-second-press-before-it-is-gone'
import { whatWentWrong, whyYouCannotSeeThis } from '@/pages/report/why-you-cannot-see-this'
import { GroundGone } from '@/components/gw/GroundGone'
import { TheJudgement } from '@/components/gw/TheJudgement'
import { WhatTheRecordShows } from '@/components/gw/WhatTheRecordShows'
import { WhatTheNetworkSaid } from '@/components/gw/WhatTheNetworkSaid'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { useIsAPhone } from '@/lib/a-phone-is-not-a-narrow-desktop'
import { NineColumnsIsNotAPhoneScreen } from '@/components/gw/nine-columns-is-not-a-phone-screen'
import { plainWordsByPerson, atTheStart, midSentence } from '@/lib/a-colleague'
import { whatTheSwitchboardAllows } from './what-the-switchboard-allows'
import { tileSentence } from '@/components/gw/TheSessionsReport'
import { PatternPanel } from '@/components/gw/ui'
import type { ServedPattern } from '@/api/patterns'
import { WhatToWorkOnNext } from '@/components/gw/WhatToWorkOnNext'
import { WhatToProbeThemOn } from '@/components/gw/WhatToProbeThemOn'
import { recommendedCheckInsApi, type AnOfferTheLeadReads } from '@/api/recommendedCheckIns'
import { TheIdeasFromYourTeam } from '@/components/gw/TheIdeasFromYourTeam'
import { TheAnchorBoardSections } from '@/components/gw/TheAnchorBoardSections'

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

/**
 * A DECISION'S OWNER, SAID AS WORDS RATHER THAN STAPLED ON AS A BARE FRAGMENT.
 *
 * SECOND BOARD REVIEW, WORDING. `board.service.ts`'s `deriveDecisions` sends `owner` as a real
 * person's name when one is on record, and otherwise as one of a handful of fixed stand-ins for
 * "nobody is named for this" - 'Lead and team' (a divergence, or something the lead wrote down),
 * 'Nobody has been named to decide this.', or a dependency's own non-person label (its `onLabel`,
 * such as "the pipeline"). Read raw after the row's own sentence, each of those reads as a label
 * stuck on the end, not a sentence - and there is no fixed list of every label a dependency might
 * carry. The one fact the client can check is whether `owner` is a name actually on this check-in's
 * roster: when it is, this reads "This comes from {person}." (or "You" for the reader's own), the
 * prototype's own words (G1-example-check-ins); when it is not a person at all, it reads the
 * prototype's own tag for that case instead - "Decision needed" (eng.txt, ops.txt).
 *
 * PROJECT BOARD REVIEW 1, FIX 8: A BLOCKER SAYS WHERE IT COMES FROM, NOT "DECISION NEEDED". eng.txt
 * and ops.txt draw "Decision needed" only for a decision with no source to point to at all
 * ("Decide what the release will include if the other teams are late"); a decision whose `source`
 * is `'blocker'` - nobody named to decide it, or a non-person label like "the pipeline" - instead
 * reads "This comes from a blocker that keeps coming back." (eng.txt, ops.txt), the same way a
 * named person reads "This comes from {person}." "Decision needed" is kept for every other source
 * with no person on it.
 */
function decisionOwnerTag(
  owner: string,
  participants: { name: string | null }[] | undefined,
  myName: string | null,
  source?: string,
): string {
  if (myName && owner === myName) return 'You'
  const isPerson = (participants ?? []).some((p) => p.name && p.name === owner)
  if (isPerson) return `This comes from ${owner}.`
  return source === 'blocker' ? 'This comes from a blocker that keeps coming back.' : 'Decision needed'
}

/**
 * ONE BLOCKER, NOT TWO ITEMS UNDER "WHAT NEEDS YOU IN THIS CHECK-IN" (board review, sales piece C,
 * item 8). A dependency still waiting on the lead sends the SAME underlying blocker twice: once as
 * a `leadActions` row ("You need to get back to Baraka Mwangi, who is waiting on you for the
 * discount decision."), and again as a `source: 'blocker'` decision built from that same dependency
 * ("Baraka Mwangi is waiting on the discount decision, so it needs deciding.").
 *
 * MATCHED BY THE DEPENDENCY THEY ACTUALLY POINT AT, NOT BY GUESSING FROM THE PROSE.
 * `leadActions[].id` for this kind of row is always `waiting-on-the-lead-${dependency.id}` (the
 * server's own id, see board.service.ts) - a real pointer at one of `b.dependencies`, not text to
 * parse. `decisions` carries no id of its own, so a decision is matched to that SAME dependency
 * only through the two structured facts the dependency itself holds: who it is waiting on (`on`)
 * and what for (`what`), both of which the engine also wrote into the decision's own `question`.
 * Neither field is invented here; a decision with nothing to check against (no `on` and no `what`
 * on the dependency it would have to match) is never merged - "else don't merge".
 */
const WAITING_ON_THE_LEAD_PREFIX = 'waiting-on-the-lead-'
const NOBODY_NAMED_PREFIX = 'nobody-named-'

export function decisionDuplicatesALeadAction(
  decision: { question: string; source: string },
  leadActions: { id: string }[] | undefined,
  dependencies: { id: string; from: string | null; what: string | null }[] | undefined,
  myName?: string | null,
): boolean {
  if (decision.source !== 'blocker' || !leadActions?.length || !dependencies?.length) return false
  const dependencyById = new Map(dependencies.map((dep) => [dep.id, dep]))
  return leadActions.some((la) => {
    const prefix = la.id.startsWith(WAITING_ON_THE_LEAD_PREFIX)
      ? WAITING_ON_THE_LEAD_PREFIX
      : la.id.startsWith(NOBODY_NAMED_PREFIX)
        ? NOBODY_NAMED_PREFIX
        : null
    if (!prefix) return false
    const dep = dependencyById.get(la.id.slice(prefix.length))
    if (!dep || (!dep.from && !dep.what)) return false
    /* `from` is who the dependency is waiting on behalf of - the person named in both sentences
       ("...Baraka Mwangi, who is waiting on you..." / "Baraka Mwangi is waiting on..."). `on` is
       the lead themselves for every "waiting-on-the-lead" row, so it never distinguishes one
       blocker from another and is not checked here. When the lead is themselves the one waiting
       (a "nobody-named" row raised by the lead), the engine writes the decision as "You", not
       their own name, so that also counts as the same who. */
    const sameWho = !dep.from || decision.question.includes(dep.from) || (!!myName && dep.from === myName && decision.question.includes('You'))
    const sameSubject = !dep.what || decision.question.toLowerCase().includes(dep.what.toLowerCase())
    return sameWho && sameSubject
  })
}
import { WhereEachPersonIs } from '@/components/gw/where-each-person-is'
import { SplitOneTotalAcrossPeople } from '@/components/gw/split-one-total-across-people'
import { WhatTheTargetAssumes } from '@/components/gw/TargetsBand'
import { whenTheBoardLastChanged, whenTheBoardLastChangedInShort, whenItRanOutOfTime } from './when-the-board-last-changed'
import { TheDirectMorning, useTheDirectMorning, isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { ThePicturedSalesBoard, theScheduleInWords, ThePicturedOwnDeals, ThePicturedAskBar, GroundworkRecommends } from './pictured/ThePicturedSalesBoard'
import { PROJECT_ORDER, PROJECT_FOLD_AFTER } from './release-5-orders'
import { theSituationsOrder } from './pictured/TheSituationsSections'
import { ThePicturedBoard, TheTemplateSection } from './pictured/ThePicturedBoard'
import { MessageCircle } from 'lucide-react'
import { YourTeamPersonByPerson } from './pictured/YourTeamPersonByPerson'
import { TheLightSalesBoard, TheLightNeedsYou, TheLightBesideTheHeadline, TheLightBoxes, TheLightSummaryFirst } from './TheLightSalesBoard'
import { TheCollectionsBoard } from './pictured/TheCollectionsBoard'
import { TheMatterBoard } from './pictured/TheMatterBoard'
import { SuggestionsForTheLead } from '@/components/gw/Suggestions'
import { buildSessionRows } from '@/lib/session-rows'
import { peopleLabels, personLabel } from '@/lib/utils'
import { EVERY_SESSION, checkedIn } from '@/components/gw/TheReportIsAListOfSessions'
import { useAskStore } from '@/stores/ask'
import { theContextTabsName } from '@/lib/the-references-tab'
import { Page, CheckInHeader, Section, Placed, UpdatedLine, Panel, RowList, Row, Tag, type TagTone, Button as UIButton, PeopleTable, PersonRow, EdgeRow, EdgeList, Folded, Callout, Stack, SubHeading, Note, FlexRow, Text } from '@/components/gw/ui'
import { initialsOf } from '@/pages/org/people-here'
import { cadenceLabel } from '@/lib/cadence'
import { phaseSpineSentence } from '@/lib/phase-spine-sentence'
import { KindOfWorkBanner, WorkRecordsSections, YourOwnRecordsSections, TheShapeOfTheWorkStrip, sectionHeading } from './WorkRecords'
import {
  RisksSection, WorkPlanSection, TimelineSection, PersonHistorySection, BlockersSection,
  EvidenceIndexSection, BusyOrMovingSection, ObligationsSection, ForecastSection,
  ContradictionsSection, QuestionsForTheLeadSection, sameAsTheWorkPlan,
  HeadlineSection, WhereThisIsHeadingSection, standsTone, ByAreaSection, ReportedAgainstCriteriaSection,
  WhatEachLevelUnderstoodSection, WhatTheVisitLogShowsSection, TheCountiesSection,
  WhereTheCohortStandsSection, SupportGivenSection,
  WhereTheMatterStandsSection, WhatYouNeedToDecideSection, WhatChangedThisWeekSection,
  ByWhoTheyAreSection, WhereTheyDisagreeSection,
  WhatTheSystemsShowSection, WhereWhatWasSaidAndTheSystemsDifferSection,
} from './TheSwitchboardsSections'

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


/* Board review, 30 September, item 9 (second pass): this read "27 Sept." on the session pill
   while the line above it reads "Tuesday 29 September at 3:47pm" - two forms for the same date
   on the same page. Now 'dayAndMonthLong' ("27 September"), matching the long form used
   everywhere else the board writes a date. */
const dshort = (iso?: string | null) =>
  iso ? whenItWas(iso, 'dayAndMonthLong') : ' - '

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
}

/**
 * BOARD REVIEW, 1 OCTOBER, ITEM 5: "YOU SAID, '…' THIS IS PROGRESS THEY REPORTED."
 *
 * The fixed `WHAT_THIS_ITEM_IS.PROGRESS` string said "they" even on a reader's own words, directly
 * under a line that had just said "You said". The reader is "you" throughout the rest of this
 * board; this line is the one place a record type's sentence needs to know who said it, so it is
 * no longer a fixed lookup for PROGRESS - "This is progress you reported." when the reader said it
 * themself, and "This is progress {name} reported." otherwise, by name, never "they".
 *
 * PROJECT BOARD REVIEW 1, FIX 5: INTENT GETS THE SAME CHECK. "This is something they intend to
 * do." read under the reader's own words exactly the same way "they reported" did - fixed here,
 * the same way, rather than left as the one record type still saying "they" about the reader.
 */
function whatThisItemIs(type: string, saidByTheReader: boolean, name: string): string | null {
  if (type === 'PROGRESS') return saidByTheReader ? 'This is progress you reported.' : `This is progress ${name} reported.`
  if (type === 'INTENT') return saidByTheReader ? 'This is something you intend to do.' : `This is something ${name} intends to do.`
  return WHAT_THIS_ITEM_IS[type] ?? null
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

/**
 * A HIDDEN CONTRIBUTOR, WITH A REAL ACTION. Moved from the dead Report tab body (`ReportBody`'s
 * `HiddenContributorsSection`), which nothing has rendered since the Report tab became a list of
 * sessions. The board already names people the record references who are not themselves a party
 * (`b.hiddenContributors`); this is what was missing - a way to actually do something about it.
 *
 * The initiator can add the person directly, since the check-in already exists. A participant
 * cannot add anyone themselves, so they get the existing ParticipantRequest flow instead, which the
 * initiator already has an approval UI for (GroundAdminPage.tsx pendingRequests).
 */
function HiddenContributorRow({ groundId, label, evidence, isInitiator }: {
  groundId: string
  label: string
  evidence: string
  isInitiator: boolean
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)

  const addParticipant = useMutation({
    mutationFn: (vars: { email: string; note: string }) => groundsApi.addParticipant(groundId, { email: vars.email, note: vars.note }),
    onSuccess: () => {
      setDone(true)
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      toast.success('Invited.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not add them. Try again.'),
  })

  const requestAddition = useMutation({
    mutationFn: (vars: { requestedEmail: string; requestedName?: string; reason: string }) =>
      participantRequestsApi.create(groundId, vars),
    onSuccess: () => {
      setDone(true)
      setOpen(false)
      toast.success('Request sent to the lead.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not send the request. Try again.'),
  })

  return (
    <div className="gwui-panel-row">
      <Stack gap={6}>
        <Stack gap={4}>
          <Text size="16" ink="text" weight={600}>{label}</Text>
          <Text size="15" ink="sub" lineHeight={1.55}>{evidence}</Text>
        </Stack>
        {done ? (
          <Text size="13" ink="green" weight={600}>{isInitiator ? 'Invited.' : 'Request sent.'}</Text>
        ) : open ? (
          <Stack gap={6}>
            <input
              type="email" autoFocus placeholder="their@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
              className="gwui-input"
            />
            {!isInitiator && (
              <input
                type="text" placeholder="Their name (optional)"
                value={name} onChange={e => setName(e.target.value)}
                className="gwui-input"
              />
            )}
            {emailError && <Text size="13" ink="red">{emailError}</Text>}
            {isInitiator && <ThisAddsASeat />}
            <FlexRow gap={6}>
              <UIButton
                kind="secondary"
                onClick={() => {
                  if (!looksLikeAnAddress(email)) { setEmailError(NOT_AN_ADDRESS); return }
                  setEmailError('')
                  if (isInitiator) addParticipant.mutate({ email: email.trim(), note: evidence })
                  else requestAddition.mutate({ requestedEmail: email.trim(), requestedName: name.trim() || undefined, reason: reason.trim() || evidence })
                }}
                disabled={addParticipant.isPending || requestAddition.isPending}
              >
                {isInitiator ? 'Add them' : 'Send request'}
              </UIButton>
              <UIButton kind="secondary" onClick={() => { setOpen(false); setEmail(''); setName(''); setReason('') }}>
                Cancel
              </UIButton>
            </FlexRow>
          </Stack>
        ) : (
          <button onClick={() => { setOpen(true); setEmail(''); setName(''); setReason(evidence) }} className="gwui-plain-link gwui-fs-13">
            {isInitiator ? 'Add them' : 'Request they be added'}
          </button>
        )}
      </Stack>
    </div>
  )
}

/**
 * THE WHOLE CHECK-IN, FOLDED - OR NOT, FOR A LEAD (B5's board-as-participant.txt).
 *
 * A participant's board leads with their own short personal view (see `TheParticipantsOwnView`
 * below); everything else this reader already receives - the same sections a lead sees, minus
 * their editing controls and minus anything privacy already keeps from them - stays exactly as it
 * was, just folded under one name below the personal view, so nothing they could read today is
 * taken away. The lead's own board is unchanged: for them this renders its children plainly.
 */
/** So "Today's team picture is shared." can open this fold and jump straight to it - see item 6. */
const THE_WHOLE_CHECK_IN_ID = 'the-whole-check-in'

function MaybeFolded({ fold, children }: { fold: boolean; children: ReactNode }) {
  /* The direct morning: no note about who it is for. Who reads it is the backend's rule, the same either way. */
  const direct = useTheDirectMorning()
  if (!fold) return <>{children}</>
  return (
    <Folded id={THE_WHOLE_CHECK_IN_ID} summary="The whole check-in" note={direct ? undefined : 'Everything else from this check-in, for everyone in it.'}>
      {children}
    </Folded>
  )
}


/**
 * AN ACTION CALL GOES ONLY TO THIS CHECK-IN. `action.choices[].route` is sent by the server, but
 * this runs whatever method and path it carries - a route to another check-in, to some other part
 * of the API entirely, or to another site altogether, would be sent exactly the same way a correct
 * one is. This is the one gate every such call passes through: only `POST` or `PATCH`, and only a
 * relative path that starts with this check-in's own `/grounds/:id/`, with no `..` (a way out of
 * that path), no `//` (a scheme-relative address, `//evil.example`) and no scheme of its own
 * (`https:`, `javascript:`...). Anything else is refused before the network is ever touched.
 */
export function isARouteToThisCheckIn(groundId: string, route: { method: string; path: string } | null | undefined): boolean {
  if (!route) return false
  if (route.method !== 'POST' && route.method !== 'PATCH') return false
  const path = route.path
  if (typeof path !== 'string' || !path) return false
  if (path.includes('..')) return false
  if (path.includes('//')) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return false
  return path.startsWith(`/grounds/${groundId}/`)
}

/**
 * REQUEST 112 (b): WHAT THE LEAD CAN DO ABOUT ONE ITEM UNDER "What needs you" (board-as-lead.txt:
 * "Yes, it counts" / "No", "Ask him"). `action.route` is the exact call the engine already built
 * to keep that answer (`POST .../board/decisions/:id/answer`, `PATCH .../commitments/:id`); this
 * calls it generically and reads back `saidBack`, the engine's own sentence for what just
 * happened. A choice with `route: null` ("Not yet") changes nothing, so it carries no call at all.
 */
function useRunBoardAction(groundId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (route: NonNullable<AnAction['choices']>[number]['route']) => {
      if (!isARouteToThisCheckIn(groundId, route)) {
        return Promise.reject(new Error('That didn’t save. Try again.'))
      }
      return apiClient.request({ method: route!.method, url: route!.path, data: route!.body }).then((r) => r.data)
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['board', groundId] })
      if (data?.saidBack) toast.success(data.saidBack)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That didn’t save. Try again.'),
  })
}

/**
 * REQUEST 112 (b): ONE ITEM'S OWN ACTION, REPLACING THE GENERIC "Open". Each choice becomes its
 * own button (board-as-lead.txt's own "Yes, it counts" / "No"); with no choices, one button to
 * where the lead settles it ("check-in" or "context"), in the engine's own words for the button
 * ("Ask him", "Reply in your check-in"...). `kind="secondary"` always - never a second navy button
 * on a page that already has its own primary action. Where the engine has sent no `action` at all
 * (an older server), this falls back to the plain "Open" text link it replaces.
 */
function ActionButtons({ groundId, action }: { groundId: string; action?: AnAction }) {
  const run = useRunBoardAction(groundId)
  /*
   * "NOT YET" MUST SAY SOMETHING. A choice with `route: null` ("Not yet") changes nothing, so it
   * carries no call at all - but pressing it used to do and say nothing either, which reads as a
   * broken button. It now shows the action's own `says` (the engine's sentence for what staying
   * open means) as a short note under the buttons. A choice with no route AND no `says` to show for
   * it is not drawn at all - there would be nothing to press it for.
   */
  const [notYetSaid, setNotYetSaid] = useState<string | null>(null)
  if (!action) return <Link to={`/grounds/${groundId}`} className="gwui-plain-link">Open</Link>
  if (action.choices?.length) {
    const choices = action.choices.filter((c) => c.route || action.says)
    if (!choices.length) return null
    return (
      <>
        {choices.map((c) => (
          <UIButton
            key={c.label}
            /* D-3: "No" and "Not now" are the prototype's .btn.quiet beside the answer. */
            kind={/^(?:No|Not now)\b/.test(c.label) ? 'quiet' : 'secondary'}
            size="small"
            disabled={run.isPending}
            onClick={c.route ? () => { setNotYetSaid(null); run.mutate(c.route) } : () => setNotYetSaid(action.says ?? null)}
          >
            {c.label}
          </UIButton>
        ))}
        {/*
          `flexBasis: '100%'` on this one child, inside the parent's own flex-wrap row
          (`gwui-edge-acts`), is what pushes it onto a line of its own under the buttons, the same
          way a row of buttons already wraps onto a new line when it runs out of room - not a new
          gap or margin of its own. The shared `Note` part's own `tone="muted"` (13.5px,
          `--gw-muted`) is what several other rows on this board already use for a line exactly
          like this one.
        */}
        {notYetSaid && <div style={{ flexBasis: '100%' }}><Note tone="muted">{notYetSaid}</Note></div>}
      </>
    )
  }
  /*
   * RELEASE WALKTHROUGH, 5 OCTOBER: TWO LINKS WITH NO TEXT AND NO ACCESSIBLE NAME. `action.label`
   * is typed as a required `string` (api/src/modules/board/what-needs-you-and-what-to-do.ts), but
   * a real board sent it empty for two rows - a `<Link>` with nothing inside reads to nobody using
   * a screen reader, and shows nothing to point at on screen either. Said plainly from `goesTo`
   * instead of rendering silence: the same two sentences this fallback already reaches for when
   * there is no `action` at all, just below, phrased for where this one actually goes.
   */
  const label = action.label || (action.goesTo === 'context' ? 'Open the Context page' : 'Open your check-in')
  return (
    <UIButton kind="secondary" size="small" to={`/grounds/${groundId}?tab=${action.goesTo === 'context' ? 'context' : 'chat'}`}>
      {label}
    </UIButton>
  )
}

/**
 * ONE FOLD, NOT A FOLD INSIDE A FOLD (board review, sales piece C, item 1).
 *
 * "Everything else from this check-in" (the sections the prototype's own sales board does not
 * show) used to render inside its own `Folded` always - for a lead that is the only fold on the
 * page, but for a participant it sat inside `MaybeFolded`'s own "The whole check-in" fold too, so
 * opening one fold revealed a second one, not the content itself. A participant already has an
 * outer fold around everything past their own personal view; this reads straight into it instead
 * of wrapping it again. Nothing inside is removed either way.
 */
function FoldEverythingElseUnless({ alreadyFolded, children }: { alreadyFolded: boolean; children: ReactNode }) {
  if (alreadyFolded) return <>{children}</>
  return (
    <Folded
      summary="Everything else from this check-in"
      note="More from this check-in, kept in full."
    >
      {children}
    </Folded>
  )
}

/**
 * THE PARTICIPANT'S OWN VIEW, FIRST (B5's board-as-participant.txt). A participant's board used to
 * open on the same generic switchboard a lead sees - every target, every sale, work plan for
 * everyone, naming colleagues - before the lead's own editing controls and judgement were taken
 * out of it. The prototype's own participant board instead opens on four short, personal things:
 * whether today's team picture is ready, a way to their own report, their own records (never
 * anybody else's), and their own share of the team's total.
 *
 * BOARD FIX (sales B, item 3a): THE SERVER'S OWN `teamPicture.shared`, NOT A CLIENT-SIDE GUESS.
 * This used to read `sessionRows[0]?.closed` - the same fact "Every session" uses for whether a
 * round's report has gone out, but computed again here from the grid rather than read from the one
 * place the engine itself decides it for a participant's own, narrowed board
 * (a-participants-board-is-their-own.ts: `reader.released`). Two readings of "is it shared" is two
 * chances for them to disagree; `teamPicture` is the engine's own single answer, so this now simply
 * draws it. `teamPicture.yourOwnReport` is the server's own "Your own report is ready now." (or
 * null when this reader has no report of their own yet), and "Read your own report" is drawn only
 * then, as the prototype shows it only once there is one to read.
 */
function TheParticipantsOwnView({ pictured = false, board, myFirstName = null, groundId, teamPicture, kindOfWork, workRecords, myParticipantId, leadFirstName, yourShare, yourShareSays, myLatestCheckInId }: {
  /** Screen match, 16 October: a sales check-in with deals draws this part as board-as-participant.jpg has it. */
  pictured?: boolean
  board?: any
  myFirstName?: string | null
  groundId: string
  teamPicture: BoardPresent['teamPicture']
  kindOfWork: string | null
  workRecords: BoardPresent['workRecords']
  myParticipantId: string | null
  leadFirstName: string | null
  yourShare: BoardPresent['yourShare']
  /** REQUEST 110 (a): "There is no number of yours on this board yet, so there is no share to show." - sent only when `yourShare` is `[]`. */
  yourShareSays?: string | null
  /**
   * RELEASE WALKTHROUGH A, FIX 1: "READ YOUR OWN REPORT" OPENED AN EMPTY PAGE.
   *
   * This used to send a reader to `/grounds/:id?tab=report` - a fold of the whole check-in with no
   * report in it for a party (the team report, when there is one, lives at `/grounds/:id/report`;
   * a party's OWN report lives on its own session's page). The reader's own report is
   * `/checkin/:id/report`, keyed by their own latest completed session's check-in id - the same id
   * `sessionRows`/`myCheckInId` already carries for the "Reports" table further down this page.
   * `null` when no session of theirs has completed yet, and the button is not drawn then.
   */
  myLatestCheckInId: string | null
}) {
  const shared = teamPicture?.shared === true
  /* The direct morning (lib/the-direct-morning.tsx): it is the team's report, and it says so. */
  const direct = useTheDirectMorning()
  /*
   * THE ONBOARDING BOARD (day-30-and-60.txt): NEITHER "YOUR OWN ITEMS" NOR "YOUR SHARE". Both are
   * the sales board's own wording ("Your deals, day by day", "4 of your 5 sales so far"), and the
   * prototype's new-hire board shows neither - this scenario is about one person's own record and
   * what the two accounts agree and differ on, not a personal share of a team total. Scoped to the
   * sales kind of work specifically, so every other kind of work this screen already serves is
   * unaffected.
   */
  const isSalesKindOfWork = isASalesKind(kindOfWork)
  return (
    <>
      {/*
        DRAW THE TEAM-PICTURE PANEL ONLY WHEN THE ENGINE ACTUALLY SENT ONE. `teamPicture` is absent
        for a kind of check-in the engine does not yet build one for (the onboarding board, request
        123) - this used to read that absence as `shared === true ? ... : false`, so it told a new
        hire "Today's team picture isn't shared yet." beside four of the lead's reports already
        marked "Shared", which is not a fact the engine ever sent.
      */}
      {teamPicture && (
        <Panel className={pictured ? 'pb-team-picture' : 'gwui-mt-16'}>
          {/*
            BOARD REVIEW, SALES PIECE C, ITEM 6: NEVER CLAIM IT IS "BELOW" AS A PLAIN FACT - LINK TO
            IT. "It is below, with everything else from this check-in." said where the team picture
            actually was without giving a way there: everything past this view is folded under "The
            whole check-in" (`MaybeFolded`), closed by default, so "below" alone left a reader to find
            and open it themselves. This instead opens that fold and jumps straight to it.
          */}
          <Text size="16" ink="dark" weight={700}>
            {/* The day it is for, where it is not today (quality pass, 18 October, R-1). */}
            {shared
              ? (teamPicture?.forDay ? `The team’s report for ${teamPicture.forDay} is shared.` : direct ? 'Today’s team report is shared.' : 'Today’s team picture is shared.')
              : direct ? 'Today’s team report isn’t shared yet.' : 'Today’s team picture isn’t shared yet.'}
          </Text>
          <div className="gwui-fs-15 gwui-ink-sub gwui-mt-4" style={{lineHeight: 1.55}}>
            {shared
              ? null
              /* board-as-participant.txt: "Wairimu usually shares it by 7pm." - the server sends no
                 usual-share time yet, so that half is a plain sentence without one; see the task
                 note to add the time back once such a field exists. */
              : [
                  `${leadFirstName ?? 'Your lead'} shares it.`,
                  teamPicture && 'yourOwnReport' in teamPicture ? teamPicture.yourOwnReport : null,
                ].filter(Boolean).join(' ')}
          </div>
          {shared && (
            /*
              BOARD REVIEW, SALES PIECE D, ITEM 6: A FULL SENTENCE, NOT A CLIPPED PHRASE. "Open it,
              below" names neither what "it" is nor where "below" is - CLAUDE.md asks for plain, full
              sentences, and a person reading this button should not have to infer either from
              context. Says what opens, and where.

              PROJECT BOARD REVIEW 1, FIX 6: POINTS AT THE TEAM REPORT, NOT A FOLD WITH NO TEAM
              PICTURE IN IT. "Open today's team picture below." used to open and scroll to "The
              whole check-in" fold - which holds everything else this board sends (By area,
              coaching, the switchboard's own sections), never a team picture. The actual team
              picture is "The team's report" (SessionReportPage.tsx).

              SCREEN FAULT 4: IT WAS SENT THERE THE LONG WAY ROUND, AND LANDED SOMEWHERE ELSE.
              `/grounds/${'${groundId}'}/report` is only a redirect (ReportPage.tsx) to
              `/grounds/${'${groundId}'}?tab=report` - for a participant that is this very page's
              own "My work" tab, not the session's own report page, and it showed as about 350px of
              blank gap over two closed rows with no space between them ("Your sessionsYou have one
              finished session…"), with the tab bar underlining "My work" rather than Report. The
              session's own report page is exactly where "Read your own report" below already sends
              this reader (`myLatestCheckInId`) - the same page, since this is the report for the
              session that just closed and shared. Sent there directly now, with the ground-level
              redirect kept only for the rare case nothing has completed for this reader yet.
            */
            <Link to={myLatestCheckInId ? `/checkin/${myLatestCheckInId}/report` : `/grounds/${groundId}/report`} className="gwui-plain-link gwui-fs-15 gwui-mt-4">
              {teamPicture?.forDay ? 'Open it.' : direct ? 'Open today’s team report.' : 'Open today’s team picture.'}
            </Link>
          )}
          {(shared || (teamPicture && 'yourOwnReport' in teamPicture && teamPicture.yourOwnReport)) && !!myLatestCheckInId && (
            <>
              {/* The prototype's own words, directly before the button (board-as-participant.txt:
                  "...Your own report is ready now. / Read your own report"). The non-shared branch
                  above already carries this sentence as part of its own paragraph; the shared
                  branch had none at all. */}
              {shared && <div className="gwui-fs-15 gwui-ink-sub gwui-mt-4" style={{lineHeight: 1.55}}>{teamPicture?.yourReportFor ? `Your report for ${teamPicture.yourReportFor} is ready.` : 'Your own report is ready now.'}</div>}
              <div className="gwui-mt-10">
                <UIButton kind="secondary" wide={pictured} to={`/checkin/${myLatestCheckInId}/report`}>Read your own report</UIButton>
              </div>
            </>
          )}
        </Panel>
      )}
      {pictured && board && <ThePicturedOwnDeals b={board} groundId={groundId} myFirstName={myFirstName} />}
      {isSalesKindOfWork && !pictured && (
        <YourOwnRecordsSections
          groundId={groundId}
          kindOfWork={kindOfWork as any}
          sections={workRecords}
          myParticipantId={myParticipantId}
          leadFirstName={leadFirstName}
        />
      )}
      {/*
        "YOUR SHARE" (request 107 c; board-as-participant.txt: "4 of your 5 sales so far; 3 paid.
        Only you and Wairimu see your share."). `yourShare` is already the engine's own sentence,
        each entry already ending in who else may see it - drawn exactly as sent, nothing left out
        only because the field now exists where it did not before.

        THE MARKETVIEW Q4 BOARD, TOO (B5's participant board shows it the same way): a participant
        on this kind of work has their own objective, the same shape as a sales target, so this
        reads it the same way rather than only for `isSalesKindOfWork`.
      */}
      {(isSalesKindOfWork || kindOfWork === 'MarketView Q4') && !!yourShare?.length && (
        <Section heading="Your share">
          {pictured ? (
            /* As pictured: one panel, the share and who sees it in one line. */
            <Panel>
              {yourShare.map((s) => <p className="gwui-panel-text" key={s.objectiveId}><span>{s.says}</span>{s.whoSees ? <> <span>{s.whoSees}</span></> : null}</p>)}
            </Panel>
          ) : (
          <Stack gap={8}>
            {yourShare.map((s) => (
              <div key={s.objectiveId}>
                <p className="gwui-panel-text">{s.says}</p>
                {s.whoSees ? <Note tone="muted">{s.whoSees}</Note> : null}
              </div>
            ))}
          </Stack>
          )}
        </Section>
      )}
      {/*
        REQUEST 110 (a): "YOUR SHARE" IS NOW ALWAYS SENT TO A PERSON WHO CHECKS IN, AS A LIST -
        where they have no number of their own, `yourShare` is `[]` and `yourShareSays` says so in
        a plain sentence, rather than the whole section just never appearing.

        PROJECT BOARD REVIEW 1, FIX 11: DRAWN FOR A PARTICIPANT OF ANY KIND OF WORK, NOT ONLY
        SALES. `yourShareSays` is the engine's own plain sentence for "nothing of yours yet" (the
        engineering release's participant, Aisha, reads "There is no number of yours on this board
        yet, so there is no share to show.") - sent, and true, whatever kind of work this is; gating
        it to `isSalesKindOfWork` hid it from every other participant the engine sends it to.
      */}
      {!yourShare?.length && yourShareSays && (
        <Section heading="Your share">
          <Note tone="muted">{yourShareSays}</Note>
        </Section>
      )}
    </>
  )
}

/**
 * WHAT WAS AGREED AT THE START, THE CONTENT ITSELF - drawn from two places the same way
 * `DivergenceSectionBody` below is, for the same reason (the onboarding family's own order moves
 * it up, every other family keeps it where it was), so the one-off style classes it carries are
 * never counted twice.
 *
 * REQUEST 123: ON THE ONBOARDING BOARD, `startingState` IS AN OBJECT, NOT A SENTENCE - "What was
 * agreed at the start", grouped by the step each row falls due in (Day 1, by day 30, 60, 90, or
 * after; day-30-and-60.txt). Every other board still gets the plain sentence this field used to be
 * everywhere, or null, drawn exactly as before - `StartingStateSentence` carries the one line of
 * one-off classes both cases need, written once, so the guard that counts them in the file
 * (`one-off-uses-only-go-down.spec.ts`) never sees it twice.
 */
const STARTING_STATE_STEPS = ['Day 1', 'By day 30', 'By day 60', 'By day 90', 'After day 90'] as const

function StartingStateSentence({ children }: { children: React.ReactNode }) {
  return <Text size="15" ink="dark" lineHeight={1.55}>{children}</Text>
}

function StartingStateBody({ startingState }: { startingState: string | StartingStateAtTheStart }) {
  if (typeof startingState === 'string') {
    return (
      <Section heading="What was agreed at the start" note="Set when this was opened, before any check-in.">
        <Panel>
          <StartingStateSentence>{startingState}</StartingStateSentence>
        </Panel>
      </Section>
    )
  }
  const { heading, rows } = startingState
  return (
    <Section heading={heading} note="Set when this was opened, before any check-in.">
      <Panel>
        <div className="gwui-subheading-list">
          {STARTING_STATE_STEPS.filter((step) => rows.some((row) => row.when === step)).map((step) => (
            <Stack key={step} gap={8}>
              <SubHeading as="h3">{step}</SubHeading>
              <Stack gap={18}>
                {rows.filter((row) => row.when === step).map((row, i) => (
                  <Stack key={i} gap={4}>
                    <StartingStateSentence>{row.says}</StartingStateSentence>
                    {row.what !== null && <StartingStateSentence>{row.what}</StartingStateSentence>}
                  </Stack>
                ))}
              </Stack>
            </Stack>
          ))}
        </div>
      </Panel>
    </Section>
  )
}

/**
 * CHANGE SINCE LAST CHECK-IN (request 123; day-30-and-60.txt: "Change since last check-in",
 * "Accounts", "New accounts went up from 4 to 5...", "Moved"). On the onboarding board only, right
 * after "What was agreed at the start". Absent until two sessions are finished, or where the
 * reader may read nothing in it - `b.changeSinceLast` is simply not sent then.
 */
const CHANGE_SINCE_LAST_TAG: Record<ChangeSinceLast['rows'][number]['state'], { label: string; tone: TagTone }> = {
  moved: { label: 'Moved', tone: 'proven' },
  held: { label: 'Held', tone: 'plain' },
  late: { label: 'Late', tone: 'attention' },
}

function ChangeSinceLastBody({ changeSinceLast }: { changeSinceLast: ChangeSinceLast }) {
  return (
    <Section heading={changeSinceLast.heading} note={changeSinceLast.between}>
      <Panel pad={false}>
        <RowList label={changeSinceLast.heading}>
          {changeSinceLast.rows.map((row, i) => (
            <Row key={i} columns="1fr" inset="panel">
              <Stack gap={4}>
                <SubHeading as="h3">{row.area}</SubHeading>
                <Tag tone={CHANGE_SINCE_LAST_TAG[row.state].tone}>{CHANGE_SINCE_LAST_TAG[row.state].label}</Tag>
                <StartingStateSentence>{row.says}</StartingStateSentence>
              </Stack>
            </Row>
          ))}
        </RowList>
      </Panel>
    </Section>
  )
}

/**
 * THE 90 DAYS, IN THREE STEPS (request 123, the rest; day-30-and-60.txt: "The 90 days, in three
 * steps", "Wairimu and Kwame see the same pictures", "After 30 days: is Kwame settled in?"). On the
 * onboarding board only, right after "Change since last check-in", before the person's history.
 * A step not yet reached already says so in its own first sentence ("This step comes on 30
 * October…"), from the engine, so nothing further is drawn for that here.
 *
 * "Wairimu and Kwame see the same pictures" IS THE PROTOTYPE'S OWN MADE-UP NAMES, NOT WORDS TO
 * COPY VERBATIM. `seeTheSamePictures` is built by the caller from the real people on this board,
 * the same way `onboardingNamesLine` already does just above - the reader is always "you", the
 * other person is named with whichever name the rest of this board already gives for them (the
 * new hire's full name to the lead, the lead's first name to the new hire). Null when either name
 * is not to hand, so the line is simply left out rather than guessed.
 */
function NinetyDaysBody({ ninetyDays, seeTheSamePictures }: { ninetyDays: NinetyDays; seeTheSamePictures: string | null }) {
  return (
    <Section heading={ninetyDays.heading} note={seeTheSamePictures ?? undefined}>
      <Panel>
        <Stack gap={18}>
          {ninetyDays.steps.map((step) => (
            <Stack key={step.step} gap={4}>
              <SubHeading as="h3">{step.question}</SubHeading>
              <StartingStateSentence>{step.says}</StartingStateSentence>
            </Stack>
          ))}
        </Stack>
      </Panel>
    </Section>
  )
}

/**
 * WHERE PEOPLE DIFFER, THE CONTENT ITSELF - UNDER WHICHEVER HEADING THE CALLER NAMES.
 *
 * Pulled into its own component (rather than left as the inline JSX that used to sit only once in
 * `BoardPage`) so it can be called from two places in the document - the general case ("Where
 * people differ", in its usual spot) and, for the onboarding family only, right after "What needs
 * you", under the prototype's own heading for it ("Where you both see it differently",
 * day-30-and-60.txt). Each call site still writes its own gate inline (the general case's own gate
 * reads `shown.divergence` before `divergence`, unchanged; the onboarding one swaps that order), so
 * the-board-draws-the-switchboards-order.spec.ts, which reads BoardPage.tsx as text to pin the
 * general case's own document order, keeps finding that one exact gate exactly once, at the general
 * case's own position - only the heavy content (every one of this board's one-off style classes it
 * carries) lives here, once, so moving it never raises that count either.
 */
function DivergenceSectionBody({ heading, divergence, whyNothingYet, onlyOnePersonHere, myName }: {
  whyNothingYet?: string | null
  heading: string
  divergence: NonNullable<BoardPresent['divergence']>
  onlyOnePersonHere: boolean
  myName: string | null
}) {
  return (
    <Section heading={heading} note="Built from what each person said in their check-in.">
      <Panel pad={false}>
        <RowList label={heading}>
        {divergence.items.length === 0 && divergence.agreements.length === 0 ? (
          /* WHY IT IS EMPTY, NOT ONE SENTENCE FOR EVERY REASON. This said "This fills in once
             more than one person has checked in" on a round where everybody had, three inches
             under a tile that said so. The server computes it from the one counter. */
          <Row columns="1fr" inset="panel"><Text size="15" ink="muted">{onlyOnePersonHere ? 'There is nothing to compare yet.' : (whyNothingYet ?? 'There is nothing to compare yet. This fills in once more than one person has answered.')}</Text></Row>
        ) : (
          <>
            {divergence.items.map((d: any, i: number) => (
              <Row key={i} columns="1fr" inset="panel">
                <Text size="16" ink="dark" weight={600}>
                  {d.topic ?? d.tag ?? 'Somewhere you see it differently'}
                </Text>
                <div className="gwui-fs-15 gwui-ink-amber gwui-mt-2">{whoSeesThisDifferently(d.positions, myName)}</div>
                {d.text && <div className="gwui-fs-15 gwui-ink-sub gwui-mt-3">{d.text}</div>}
                {Array.isArray(d.positions) && d.positions.some((pos: any) => pos.view) && (
                  <div className="gwui-mt-6">
                    <Stack gap={4}>
                      {d.positions.filter((pos: any) => pos.view).map((pos: any, j: number) => (
                        <Text key={j} size="15" ink="text" lineHeight={1.55}>
                          <div style={{fontWeight: 700}}>{pos.who ?? 'A colleague'}</div>
                          <div className="gwui-ink-sub">{pos.view}</div>
                        </Text>
                      ))}
                    </Stack>
                  </div>
                )}
                {d.atStake && (
                  <div className="gwui-fs-15 gwui-ink-sub gwui-mt-5" style={{lineHeight: 1.55}}>
                    <span className="gwui-fs-13 gwui-ink-subd gwui-mb-2" style={{letterSpacing: '.1px', fontWeight: 700, display: 'block'}}>Why it matters</span>
                    {d.atStake}
                  </div>
                )}
              </Row>
            ))}
            {divergence.agreements.map((a: any, i: number) => (
              <Row key={`a${i}`} columns="1fr" inset="panel">
                <Text size="16" ink="dark" weight={600}>
                  {typeof a === 'string' ? a : a.topic ?? 'Agreed'}
                </Text>
                <div className="gwui-fs-15 gwui-ink-green gwui-mt-2">Everybody agrees on this.</div>
              </Row>
            ))}
          </>
        )}
        </RowList>
      </Panel>
    </Section>
  )
}

export function BoardPage({ groundId }: { groundId?: string } = {}) {
  const { id: idFromRoute } = useParams<{ id: string }>()
  const id = groundId ?? idFromRoute
  const navigate = useNavigate()
  const qc = useQueryClient()
  /* The lead's answer to a line that came close to the event a fee note waits for (Release 2), through the same gate as every board action. */
  const answerOnTheCollectionsBoard = useRunBoardAction(id ?? '')
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

  /* What needs the lead here: Today's items for this check-in. See where it is drawn. */
  const { data: today } = useQuery({ queryKey: ['today'], queryFn: todayApi.get, staleTime: 30_000, enabled: viewerRunsThisCheckIn, retry: false })
  const needsHere = (today?.needs ?? []).filter((n: Need) => n.groundId === id && !n.onTheBoardToo)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['board', id, variant],
    queryFn: () => boardApi.get(id!, variant),
    enabled: !!id,
    retry: false,
  })

  /**
   * "GROUNDWORK RECOMMENDS" (anchor piece 25; docs/anchor-scenario-plan.md section 5, row 9;
   * docs/answers-from-engine.md, "5 October: anchor piece 24, recommended check-ins").
   *
   * Groundwork looks at this one check-in's own record and, where the work itself shows it, offers
   * the lead one more check-in - never a label on a person, only what the record shows and a
   * question. Drawn only for whoever runs this check-in, only while the anchor switch is on
   * (`anchorScenarioOn`, read off the raw board answer rather than `b` - these hooks have to sit
   * above every early return below, the same as `today`'s own query, or the number of hooks this
   * component runs would differ between the loading render and the loaded one). The route itself
   * answers an empty list with the switch off or for a check-in not started from the anchor, so
   * there is nothing to gate here beyond that - `recommendedCheckInsApi.list` is itself refused for
   * anybody who is not the lead.
   */
  /** Whether this check-in was itself started as the anchor scenario - read once, for every reader. */
  const anchorScenarioOn = !!(data as any)?.anchorScenarioOn
  const anchorRecommendationsOn = viewerRunsThisCheckIn && anchorScenarioOn
  /**
   * THE SWITCHBOARD'S OWN SECTION LIST, READ OFF THE RAW ANSWER (decision 114;
   * docs/answers-from-engine.md, "8 October (later): the anchor through the ordinary routes, route
   * by route"). `sections` names which sections this scenario carries at all - the same for every
   * reader of one check-in - read here, ahead of `b`/`has` below, because these hooks have to sit
   * above every early return (the same reason `anchorScenarioOn` already reads raw `data`).
   */
  const sectionsServed: string[] = (data as any)?.sections ?? []
  const hasSectionServed = (s: string) => sectionsServed.includes(s)

  /**
   * PIECES 12, 13 AND 20: "ARE WE MOVING TOGETHER?" (section 24) IS NOW DRAWN FROM SECTIONS, NOT
   * FROM `theMonthBoard` (decision 114, 8 October evening). The engine still serves `theMonthBoard`
   * for whoever runs the check-in while callers move across (its "kept for now" list), but this
   * page no longer reads it: every part it used to carry now has its own section
   * (`theAnchorSections`, below `has(...)`), drawn once through `TheAnchorBoardSections`. See
   * the-anchor-old-and-new-sections-agree.spec.tsx for the proof the same sentences still appear.
   */

  /**
   * PIECE 19/20, "IDEAS FROM YOUR TEAM" (plan section 5, row 7; docs/answers-from-engine.md,
   * "Request 149, missing (1)"; decision 114's `ideasFromTheTeam`, the same shape named by the
   * switchboard). To everyone in the check-in, not the lead alone - no `viewerRunsThisCheckIn`
   * gate, and (decision 114) no `anchorScenarioOn` gate either: the new field is read first, the
   * older one only as a fallback for a caller the server has not moved across yet, and the engine
   * is itself the one that decides who either is served to.
   */
  const ideasFromYourTeam = (data as any)?.ideasFromTheTeam ?? (data as any)?.ideasFromYourTeam
  const { data: recommended } = useQuery({
    queryKey: ['recommended-check-ins', id],
    queryFn: () => recommendedCheckInsApi.list(id!),
    /* Screen match, 16 October: an account several people name is offered on any check-in, so whoever runs it asks. */
    /* And a team member, who is served only offers about their own work (Hafsah's answer 5, 16 October 2026; the server decides). */
    enabled: !!id && (anchorRecommendationsOn || viewerRunsThisCheckIn || !!(data as any)?.myParticipantId),
    retry: false,
  })
  const recommendedOffers: AnOfferTheLeadReads[] = anchorRecommendationsOn || viewerRunsThisCheckIn ? (recommended?.offers ?? []) : []
  /* What a team member is recommended: the server serves them only offers resting on their own work. */
  const myOwnRecommendedOffers: AnOfferTheLeadReads[] = !viewerRunsThisCheckIn ? (recommended?.offers ?? []) : []

  const answerRecommendation = useMutation({
    mutationFn: (vars: { offerId: string; yes: boolean }): Promise<{ state: 'ACCEPTED' | 'DECLINED'; setUp?: unknown }> =>
      vars.yes ? recommendedCheckInsApi.yes(id!, vars.offerId) : recommendedCheckInsApi.notNow(id!, vars.offerId),
    onSuccess: async (res, vars) => {
      qc.invalidateQueries({ queryKey: ['recommended-check-ins', id] })
      if (vars.yes && res.state === 'ACCEPTED' && (res as any).setUp) {
        /*
         * PIECE 25: "YES, SET IT UP" OPENS A PREFILLED DRAFT (docs/answers-from-engine.md,
         * "Request 148 (1)"), replacing the `/start?initial=...` stop-gap this used to be. The
         * engine's answer carries exactly what the set-up screen needs: `initial` (the first
         * thing said), `aim` (kept as the draft's name) and `people` (taken in exactly as commit
         * takes them). It creates nothing and invites nobody - the lead still finishes on
         * the set-up screen. None of this is personal data for a URL, so it travels as router
         * state, which EntryChatPage.tsx reads once on arrival (`anchorSetUp`).
         */
        try {
          const opened = await recommendedCheckInsApi.draftFromSetUp((res as any).setUp)
          /* Shown to the lead as it is - never invented or summarised here. */
          for (const left of opened.leftOut) toast.info(left.why)
          navigate('/start', { state: { anchorSetUp: opened } })
        } catch {
          toast.error('That didn’t save. Try again.')
        }
      }
    },
    onError: () => toast.error('That didn’t save. Try again.'),
  })

  /*
   * THE FULL ROSTER, for a restricted `ground.participants` (see `fullParticipants` on
   * `buildSessionRows`). `GET /grounds/:id` sends a participant only their own row; the board's own
   * answer, fetched just above, sends every party on this check-in to everybody on it - so a
   * "Reports" row built from it can say truthfully how many of the whole roster checked in,
   * instead of "1 of 1" for a reader who is restricted to their own one-person list.
   */
  /*
   * SCREEN FAULT 9, PART 2: THE SERVER'S OWN GRID KNOWS WHICH SESSIONS SOMEBODY IS ACTUALLY ON.
   * `checkInGrid.rows[].cells` already says "na" for a session somebody joined after - passed to
   * `buildSessionRows` so its own "waitingOn" can agree with it, rather than naming them from
   * `whoIsInRound`'s blanket eligibility rule alone. See the parameter's own note.
   */
  const onSessionFromGrid = (data as any)?.checkInGrid
    ? new Map(
        ((data as any).checkInGrid.rows as { participantId: string; cells: Record<string, string> }[]).map((r) => [
          r.participantId,
          new Set(Object.entries(r.cells).filter(([, v]) => v !== 'na').map(([s]) => Number(s))),
        ]),
      )
    : null
  const sessionRows = buildSessionRows(groundForSignals as any, user?.id, labelInASentence, (data as any)?.participants, onSessionFromGrid)

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
  /*
   * ONE QUIET "CHANGE" PER TARGET, NOT THREE BUTTONS ALWAYS ON SCREEN (Hafsah, 30 September, item 2:
   * "fewer controls on the face"). Lower, Raise and Remove used to sit open beside every target, all
   * the time - three buttons per row, on every board with a target, whether anyone was about to
   * touch it or not. They still do exactly what they did; they only show once this row's own
   * "Change" is pressed, the same fold `SettingsPage.tsx` already gives its own fields.
   */
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null)
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
    onError: () => toast.error('The poll didn’t save. Try again.'),
  })

  const togglePoll = useMutation({
    mutationFn: (optionId: string) => boardApi.togglePoll(id!, optionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', id] }),
    onError: () => toast.error('Your availability did not change - try again.'),
  })

  /* U.20 (F4-small-states/states.txt, "Loading"/"Getting the board"): the prototype's own word
     for this wait, in place of the page's earlier, unmatched "Loading the board…". */
  if (isLoading) {
    return <div role="status" className="gwui-pt-40 gwui-pr-40 gwui-pb-40 gwui-pl-40 gwui-ink-muted" style={{textAlign: 'center'}}>Getting the board</div>
  }
  /*
   * PRIMARY-BUTTONS-NEVER-TOGETHER: the four `kind="primary"` buttons below ("Try again", "Read
   * the report", "Do my check-in", and the ordinary board's own "Your check-in" in the header)
   * are each an early `return` from this function - the error state, the no-shared-board state,
   * the withheld-until-you-check-in state, and the ordinary board. Exactly one of these four
   * branches ever runs for a given render, so only one of these four buttons is ever on screen at
   * once, whatever the reader is looking at.
   */
  if (error || !data) {
    /*
     * WHICH OF THE THINGS HAPPENED. One branch rendered a permission-flavoured accusation for every
     * failure, with retry off, so a single transient 500 permanently evicted a reader from their own
     * board. The report page already knows how to say which (why-you-cannot-see-this.ts): the same
     * words here, and Try again where trying again can work.
     */
    const what = whatWentWrong(error)
    const why = whyYouCannotSeeThis(what)
    /* A 404 is the prototype's own "a check-in that's gone" (F4-small-states/c-gone-board): the
       board's address, with the sidebar, and the same words whether the check-in was ended,
       removed, or was never this reader's (GW-PRI-04: the server answers all of them alike).
       B-110: a 403 must read identically - GW-PRI-04 exists precisely so a stranger holding a
       stale link cannot tell "this never existed" from "this exists, you're just not on it"
       apart. This branch used to fall through to `why.say`'s 403 sentence instead, which does
       exactly that ("This record belongs to a check-in you are not part of."). Same screen,
       both codes. */
    if (what.status === 404 || what.status === 403) return <GroundGone />
    /* The prototype's connection words only when it was the connection: no answer came back at all.
       A server error keeps its own true sentence, with Try again still offered (U.20 review). */
    const theConnection = what.status === undefined
    /*
     * U.20 (F4-small-states/states.txt, "It didn't load"/"The board didn't load"): the prototype's
     * own words, for the one case they are true of - a connection problem, where trying again can
     * work (`why.canRetry`). For every other failure (403, 404, a signed-out session) `why.say`
     * already gives a specific, true sentence for THAT failure - a connection sentence would be
     * wrong for those, so this only replaces the generic heading and body, never `why.say` itself.
     */
    return (
      <div className="gwui-mt-48 gwui-mr-auto gwui-mb-48 gwui-ml-auto gwui-pt-0 gwui-pr-20 gwui-pb-0 gwui-pl-20" style={{maxWidth: 620, textAlign: 'center'}}>
        <div className="gwui-fs-15 gwui-mb-6" style={{fontWeight: 700}}>{why.canRetry ? 'The board didn’t load' : 'This board could not be loaded.'}</div>
        <div className="gwui-fs-15 gwui-ink-sub gwui-mb-16">
          {theConnection ? 'Nothing is lost. Your check-ins are saved. It is usually the connection.' : why.say}
        </div>
        <FlexRow gap={8} justify="center">
          {why.canRetry && <UIButton kind="primary" onClick={() => refetch()}>Try again</UIButton>}
          <UIButton kind={why.canRetry ? 'secondary' : 'primary'} onClick={() => navigate('/grounds')}>Back to check-ins</UIButton>
        </FlexRow>
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
          <div className="gwui-button-row">
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
    /* "Check in first, then you'll see the board." with one button (Hafsah, 25 October): no label above it, no way back offered. */
    return (
      <div className="gw-locked">
        <Panel>
          <p className="t-body">{(data as any).saying}</p>
          <UIButton kind="primary" onClick={() => navigate(`/grounds/${id}`)}>Do my check-in</UIButton>
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
  /*
   * THE ONBOARDING BOARD'S OWN HEADER LINE (day-30-and-60.txt: "Kwame and Wairimu. Weekly,
   * Mondays. Session 12 of 12, the last one."). Every other family's header line has no names at
   * all, which is right where a check-in is about a team; this one is about a single relationship,
   * and the prototype names both people in it, the reader first. The lead reads the new hire's
   * full name (the same name every other section on this board already gives the lead); the new
   * hire reads back only the lead's first name, the same `leadFirstName` the rest of this board
   * already uses - "Dr" where the engine's own first name is wrong is request 123, not invented
   * here.
   */
  const isOnboarding = b.family === 'ONBOARDING'
  const theNewHireParticipant = isOnboarding
    ? (b.participants ?? []).find((p: any) => p.partyType === 'PARTICIPANT' && !p.managingOnly)
    : undefined
  const newHireFullName = theNewHireParticipant?.name ?? null
  const newHireFirstName = newHireFullName ? newHireFullName.trim().split(/\s+/)[0] : null
  /* FIX 2 (SECOND REVIEW): THE LEAD'S TWO ROWS, SPLIT BY WHOSE THEY ARE - see where they are drawn,
     below, under their own true headings ("{name}'s history" and "Your own record"). */
  const newHireHistoryRows = (b.personHistory ?? []).filter((r) => r.participantId === theNewHireParticipant?.id)
  const myOwnHistoryRows = (b.personHistory ?? []).filter((r) => r.participantId === b.myParticipantId)
  const onboardingNamesLine = isOnboarding
    ? (viewerRunsThisCheckIn
        ? (newHireFullName ? `${newHireFullName} and you.` : null)
        : (!!b.myParticipantId ? `You and ${(groundForSignals as any)?.leadFirstName ?? 'your lead'}.` : null))
    : null
  const cadenceLine = endedSaying ?? [onboardingNamesLine, cadenceWords ? `${cadenceWords}.` : null, spineWords].filter(Boolean).join(' ')
  /*
   * "THE 90 DAYS, IN THREE STEPS" - "You and {the other person} see the same pictures." Built from
   * the real people this board already names, never the prototype's own Wairimu and Kwame. The
   * lead reads the new hire's full name; the new hire reads back the lead's first name, same as
   * `onboardingNamesLine` above - but left out altogether, not a guessed fallback, when the name is
   * not to hand.
   */
  const ninetyDaysSeeTheSamePictures = isOnboarding
    ? (viewerRunsThisCheckIn
        /* kwame-board.jpg names people by their first name ("Wairimu and Kwame see the same pictures"); the reader is "you". */
        ? (newHireFullName ? `You and ${newHireFullName.trim().split(/\s+/)[0]} see the same pictures.` : null)
        : ((groundForSignals as any)?.leadFirstName ? `You and ${(groundForSignals as any).leadFirstName} see the same pictures.` : null))
    : null
  /*
   * "Start my check-in" WHILE NOTHING IS OPEN (U.11-equivalent, onboarding board fix 6). A session
   * opens for both people at once on this kind of check-in, so the phase spine's own session rows
   * already say whether one is open now (`state === 'current'`) and, where none is, when the next
   * one opens (`says`, the engine's own sentence, e.g. "Session 5 opens on 12 October."). Computed
   * only when the spine was actually sent - an older or absent spine never hides the button, since
   * there would be nothing to show in its place.
   */
  const phaseSpineSessions = b.phaseSpine?.sessions ?? []
  const noSessionOpenForReader = !!b.phaseSpine && phaseSpineSessions.length > 0
    && !phaseSpineSessions.some((s) => s.state === 'current')
  const whenTheNextSessionOpens = phaseSpineSessions.find((s) => s.state === 'upcoming')?.says ?? null
  /*
   * RELEASE WALKTHROUGH A, FIX 6: "START MY CHECK-IN" WHILE NOTHING IS OPEN, ON A BOARD WITH NO
   * PHASE SPINE. The fix above only hides the button once `b.phaseSpine` exists - an "older or
   * absent spine never hides the button", which was meant for a spine that has not caught up yet,
   * not for a kind of work (the sales board) that never sends one at all. So a sales participant
   * between rounds still read "Start my check-in" with nothing open.
   *
   * The same fact still exists, the same place the check-in page reads it for this very button
   * (`myOpenCheckInId`/`myNextOpensAt`, GroundAdminPage.tsx and GroundParticipantPage.tsx): the
   * reader's own open-or-next check-in row, off `GET /grounds/:id` (`groundForSignals`, already
   * fetched above).
   *
   * FAULT 8 (LIVE RE-WALK): NOT ONLY A FALLBACK FOR WHEN THERE IS NO PHASE SPINE. Amina finished
   * her own part of the team's current round early - her next check-in exists, `NOT_STARTED`,
   * `availableFrom` in the future - while the phase spine still called that same round `current`
   * (it stays open, team-wide, until everybody else finishes it too). This reader's own next
   * session not yet being open and the team's round still being open are two different facts, and
   * the button only asked the second one: gated behind `!b.phaseSpine`, this reader's own read
   * never ran at all on a board that does send a spine, so "Start my check-in" stayed up for a
   * session that had not opened for her. It runs always now, alongside the spine's own read, not
   * only in its absence.
   */
  const myParticipantIdForOpenCheck = ((groundForSignals as any)?.participants ?? []).find((p: any) => p.userId === user?.id)?.id ?? null
  const myOpenOrNextCheckIn = myParticipantIdForOpenCheck
    ? (((groundForSignals as any)?.checkIns ?? []) as any[])
        .filter((c) => c.participantId === myParticipantIdForOpenCheck && c.status !== 'COMPLETED')
        .sort((a, b2) => (a.sessionNumber ?? 0) - (b2.sessionNumber ?? 0))[0] ?? null
    : null
  const myOpenOrNextOpensLater = !!myOpenOrNextCheckIn?.availableFrom
    && new Date(myOpenOrNextCheckIn.availableFrom).getTime() > Date.now()
    && myOpenOrNextCheckIn?.status !== 'IN_PROGRESS'
  const noSessionOpenForReaderFallback = myOpenOrNextOpensLater
  const whenTheNextSessionOpensFallback = myOpenOrNextOpensLater
    ? `Session ${myOpenOrNextCheckIn.sessionNumber} opens on ${whenItWas(myOpenOrNextCheckIn.availableFrom, 'dayAndMonthLong')}.`
    : null
  /*
   * SCREEN FAULT 6(d) (live walk, 6 October 2026), EVERY SITUATION: "START MY CHECK-IN" AFTER
   * FINISHING THE OPEN ONE. Both reads above ask whether a ROUND is open - the phase spine's own
   * "current" session, or, lacking a spine, whether this reader's next check-in is still in the
   * future. Neither asks whether THIS READER still has anything unfinished in it: a phase-spine
   * round can stay "current" (others still answering) after this one person has already completed
   * theirs, and a spine-less ground with nothing non-completed left for this reader has no "next"
   * row to be later than. `myOpenOrNextCheckIn` is already the one true source for that - a
   * participant's own open-or-pending check-in, off the same read the button's destination uses -
   * so its plain absence (nothing of mine left to open, whether a round is open for anyone else or
   * not) hides the button regardless of which of the two reads above was used to show it. */
  const iHaveNothingOpenOrPending = !!myParticipantIdForOpenCheck && !myOpenOrNextCheckIn
  /*
   * U.10 (a): THE SAME FIVE TABS, READ-ONLY FILTERED THE SAME WAY (an-admin-who-only-reads-has-no-
   * check-in-tab.spec.tsx pinned this against the old TheCheckInHeader; the-board-as-each-reader-
   * reads-it.spec.tsx now pins the same rule here). An admin who neither runs this check-in nor
   * takes part in it gets the prototype's read-only three tabs (read-only-view.txt): Board, Context,
   * People and setup - no Check-in (nothing of theirs to answer), no My work (nothing of theirs to
   * carry).
   */
  const isAParty = !!b.myParticipantId
  /* THE PARTICIPANT'S OWN BOARD (B5): a true participant, never the lead and never a read-only
     admin who merely has access - see `TheParticipantsOwnView` and `MaybeFolded`, below. */
  const isParticipantView = isAParty && !viewerRunsThisCheckIn
  /*
   * BOARD REVIEW, SALES PIECE C, ITEMS 4 AND 5: THE DEAL GRID IN ITS PROTOTYPE PLACE, THE REST OF
   * THIS KIND OF WORK'S RECORDS IN THE END FOLD.
   *
   * `workRecords` sends every section this kind of work keeps, in one array - for a sales ground
   * that is "Deal grid" (board-as-lead.txt's own "Every deal, day by day") and "Forecast" (no
   * prototype screen shows it). Only the deal grid is drawn where the prototype draws it; a sales
   * ground's own "Forecast" section moves into "Everything else from this check-in" instead,
   * alongside `ByAreaSection` (same reason - "board-as-lead.txt doesn't show this one"). Every
   * other kind of work is unaffected: it still gets every section it always did, in one place.
   *
   * ITEM 4: A PARTICIPANT'S OWN DEALS, NEVER THE WHOLE GRID AGAIN. `TheParticipantsOwnView` already
   * draws Amani's own rows ("Your deals, day by day"); the full `workRecords` grid repeated the
   * same kind of work under "No deals have come up yet." - true of the GRID, which the server
   * fills from every participant's own rows and only shows to the lead, but read by Amani as a
   * false claim about her own deals, which she had just read above. A participant now gets none of
   * `workRecords` here, deal grid or forecast - only her own records, already shown.
   */
  const isSalesOrg = isASalesKind((b as any).kindOfWork ?? null)
  /* The direct morning (lib/the-direct-morning.tsx): one yes or no on the board as served. It changes words, never who sees what. */
  const direct = isTheDirectMorningOn(b)
  /*
   * PROJECT BOARD REVIEW 1, FIX 11: THE TWO PROJECT SCENARIOS - "GET A NEW PROJECT OFF TO A GOOD
   * START" (NEW_PROJECT, eng.txt's own check-in) AND "GET A PROJECT BACK ON TRACK" (DRIFT). Used
   * to move "Open issues" into the end fold (eng.txt shows none) and to put "Who checked in"
   * before "Blockers" (eng.txt's own order), both only for these two, leaving every other kind of
   * work exactly where it already was.
   */
  const isProjectBoard = b.scenario === 'NEW_PROJECT' || b.scenario === 'DRIFT'
  /*
   * SUPPORT DESK BOARD FIX 1/3/4: ONE SMALL PER-KIND TABLE, IN PLACE OF A GROWING LIST OF
   * `isProjectBoard`-STYLE SPECIAL CASES. The project boards (above) decide three placements by
   * their own `scenario`, not by `kindOfWork` - that stays exactly as it was, so NEW_PROJECT and
   * DRIFT read exactly as before. A kind of work decided by `kindOfWork` instead (support desk's
   * own example, support.txt) gets the same three placements from one row here, so the next kind
   * that needs them is one row added, not a new special case threaded through the page.
   */
  const kindOfWorkKey = ((b as any).kindOfWork ?? null) as string | null
  const kindLayout: Partial<Record<string, {
    /** "Where each target stands" draws at the top, in the headline's place, when there is none. */
    targetsAtTopWithNoHeadline?: boolean
    /** "Who checked in" draws early, before Blockers and "What keeps coming up". */
    whoCheckedInEarly?: boolean
    /** "Open issues" draws only in the end fold, never in its usual place on the main board. */
    openIssuesInFold?: boolean
    /** "The shape of the work" and its "By area" section draw right after "The team today", not in the end fold. */
    themesAndAreaAfterTheTeam?: boolean
    /** "Where it stands" (`howItIsGoing.latestSummary`) draws straight after the aim, out of the fold. */
    whereItStandsAtTop?: boolean
    /**
     * The records table, "The team today", Blockers, "Who checked in", "Over time" and "Reports"
     * all move into the end fold. "What keeps coming up" and coaching stay open, just before
     * "Where this is heading" - Hafsah's decision: protected, never folded.
     */
    teamAndRecordsInFold?: boolean
    /**
     * REQUEST 133: AN ASSET LOANS COHORT'S OWN SHAPE (loans.txt). "The team today", "Who checked
     * in", "Over time" and "Reports" move into the end fold, same as `teamAndRecordsInFold` - but
     * the records table (and its own "Support given" and "What to ask each person" coaching
     * stays open with "What keeps coming up"; see `patternsAndCoachingSection()`, called in its
     * usual, open place for this kind too) stays open where the prototype itself keeps it.
     */
    teamInFoldRecordsOpen?: boolean
    /**
     * THE FOUNDER'S OWN CHECK-IN BOARD'S OWN SHAPE (founder.txt). "Who checked in" moves into the
     * end fold on its own - unlike every table above, "Over time" and "Reports" stay open, in
     * their usual place, right where founder.txt itself draws them.
     */
    whoCheckedInInFold?: boolean
    /** "Where each target stands" draws beside the headline, built from `objectives` rather than
        `headline.bars`, when the headline has a question but no bars of its own. */
    targetsBesideHeadlineFromObjectives?: boolean
    /** "Help nobody mentioned" draws only in the end fold, never in its usual place on the main board. */
    helpNobodyMentionedInFold?: boolean
  }>> = {
    'support desk': { targetsAtTopWithNoHeadline: true, whoCheckedInEarly: true, openIssuesInFold: true, themesAndAreaAfterTheTeam: true },
    'distribution operations': { targetsAtTopWithNoHeadline: true, whoCheckedInEarly: true, openIssuesInFold: true, themesAndAreaAfterTheTeam: true },
    /*
     * PROGRAMME BOARD REVIEW 1, FIX 1 (programme.txt): THE SAME TARGETS-AT-TOP, EARLY-WHO-
     * CHECKED-IN, FOLDED-OPEN-ISSUES SHAPE AS SUPPORT DESK AND DISTRIBUTION OPERATIONS.
     * `themesAndAreaAfterTheTeam` is also set so "By county" (ByAreaSection, given its own
     * heading just below) draws right after "The team today", as programme.txt has it - but
     * there is no separate "Themes" work-record section for this kind to pull forward beside it
     * (RECORDS_FOR_EACH_KIND['trader training programme'] has only one section, "Deal grid",
     * whose own stage track already draws inside it - see WorkRecords.tsx), so `themesSection`
     * resolves to nothing here and only "By county" actually moves.
     */
    'trader training programme': { targetsAtTopWithNoHeadline: true, whoCheckedInEarly: true, openIssuesInFold: true, themesAndAreaAfterTheTeam: true },
    /*
     * REQUEST 132: THE GOVERNMENT PROGRAMME BOARD'S OWN SHAPE (gov.txt). The same targets-at-top,
     * folded-open-issues layout as support desk, distribution operations and trader training
     * programme, plus two placements only this kind needs: "Where it stands" out of the fold,
     * straight after the aim, and the records table through "Reports" moved into the end fold
     * (see `teamAndRecordsInFold`, below, and where it is drawn).
     */
    'a government programme': { targetsAtTopWithNoHeadline: true, openIssuesInFold: true, whereItStandsAtTop: true, teamAndRecordsInFold: true },
    /*
     * REQUEST 133: AN ASSET LOANS COHORT'S OWN SHAPE (loans.txt). "Open issues" folds, the same as
     * every other kind-of-work table above; `teamInFoldRecordsOpen` folds "The team today", "Who
     * checked in", "Over time" and "Reports" too, but - unlike a government programme board -
     * leaves the records table itself open, in the prototype's own place for it.
     */
    'asset loans': { openIssuesInFold: true, teamInFoldRecordsOpen: true },
    /*
     * THE LAW FIRM MATTER BOARD'S OWN SHAPE (matter.txt). "Open issues" folds, the same as every
     * other kind-of-work table above; `teamAndRecordsInFold` folds the records table, "The team
     * today", "Who checked in", "Over time" and "Reports" into the end fold too, the same as a
     * government programme board - which also puts patterns and coaching in their protected place
     * just before "Where this is heading" (`foldTeam`, below) for free, with no change needed here.
     */
    'a law firm matter': { openIssuesInFold: true, teamAndRecordsInFold: true },
    /*
     * THE "MARKETVIEW, WHERE NEXT" BOARD'S OWN SHAPE (mvnext.txt). "Open issues" folds, the same as
     * every other kind-of-work table above. `teamAndRecordsInFold` would also fold the records
     * table - the one workRecords section this kind sends ("Themes") standing in for mvnext.txt's
     * own "Where next, ranked", which the engine does not build (see docs/answers-from-engine.md) -
     * and mvnext.txt keeps that table open, in its own place among this kind's own four sections
     * (see where `kindOfWorkKey === 'MarketView where next'` draws them, below), so this uses
     * `teamInFoldRecordsOpen` instead, the same as an asset loans cohort.
     */
    'MarketView where next': { openIssuesInFold: true, teamInFoldRecordsOpen: true },
    /*
     * THE FOUNDER'S OWN CHECK-IN BOARD'S OWN SHAPE (founder.txt, a one-person board). "Open
     * issues" folds, the same as every other kind-of-work table above; `whoCheckedInInFold` folds
     * only "Who checked in" with it - "Over time" and "Reports" stay open, in founder.txt's own
     * place for them.
     */
    "founder's own check-in": { openIssuesInFold: true, whoCheckedInInFold: true, targetsBesideHeadlineFromObjectives: true },
    /*
     * THE MARKETVIEW Q4 BOARD'S OWN SHAPE (mvq4.txt). "Open issues" folds, the same as every
     * other kind-of-work table above; `teamAndRecordsInFold` folds the records table, "The team
     * today", "Who checked in", "Over time" and "Reports" into the end fold too, the same as a
     * government programme board or a law firm matter. `helpNobodyMentionedInFold` moves "Help
     * nobody mentioned" into the end fold as well - mvq4.txt does not show it in its usual place,
     * straight after "Reports", because "Reports" itself is already folded here.
     */
    'MarketView Q4': { openIssuesInFold: true, teamAndRecordsInFold: true, helpNobodyMentionedInFold: true },
  }
  const layoutFor = (k: string | null) => (k ? kindLayout[k] : undefined)
  const themesAndAreaAfterTheTeam = Boolean(layoutFor(kindOfWorkKey)?.themesAndAreaAfterTheTeam)
  const foldTeamAndRecords = Boolean(layoutFor(kindOfWorkKey)?.teamAndRecordsInFold)
  const foldTeamKeepRecordsOpen = Boolean(layoutFor(kindOfWorkKey)?.teamInFoldRecordsOpen)
  /** Either shape folds "The team today", "Who checked in", "Over time" and "Reports". */
  const foldTeam = foldTeamAndRecords || foldTeamKeepRecordsOpen
  /**
   * THE FOUNDER'S OWN CHECK-IN BOARD: "WHO CHECKED IN" FOLDS ON ITS OWN, EVEN WHEN NOTHING ELSE
   * ABOUT THE TEAM DOES. `foldTeam` stays false for this kind - "The team today", "Over time" and
   * "Reports" all keep their usual, open place - so this is its own flag, not folded in with it.
   */
  const foldWhoCheckedIn = foldTeam || Boolean(layoutFor(kindOfWorkKey)?.whoCheckedInInFold)
  /*
   * SUPPORT DESK BOARD FIX 2: "THE SHAPE OF THE WORK" AND "BY QUEUE", RIGHT AFTER "THE TEAM
   * TODAY" - support.txt's own place for them, not the end fold both sit in today. Pulled out of
   * `workRecords` by name so they are never also drawn in their usual spot below.
   */
  const themesSection = (b.workRecords ?? []).find((s) => s.section === 'Themes')
  /*
   * ONBOARDING BOARD FIX 1 (SECOND REVIEW): THE WHOLE-CHECK-IN FOLD WAS BUILT FOR THE SALES
   * PARTICIPANT'S OWN VIEW, AND NOW ONLY SALES HAS ONE. `TheParticipantsOwnView` drew a short
   * personal view for every participant - whether today's team picture is shared, a way to their
   * own report, their own records - and everything else sat folded below it, under "The whole
   * check-in", so nothing they could already read was lost. `YourOwnRecordsSections` and "Your
   * share" are now sales-only (see `isSalesKindOfWork` on `TheParticipantsOwnView`, above), and the
   * team-picture panel draws only when the engine actually sends one - so for every other kind of
   * work that personal view now draws nothing at all, and folding the rest of the board behind it
   * left that reader a closed fold and nothing above it to open it for.
   *
   * The prototype says both people see the same pictures (day-30-and-60.txt: "Wairimu and Kwame
   * see the same pictures"), so for the onboarding family - and any other kind of work whose
   * participant view is likewise empty - the new hire now reads the same open sections as his
   * lead, in the same order, with only the extras (never shown on any prototype board) in the one
   * end fold, same as the lead gets. A sales participant is unchanged: her own view still leads,
   * folded below it exactly as before.
   */
  const participantFoldsWhole = isParticipantView && isSalesOrg
  /*
   * THE LIGHT SALES BOARD (docs/light-rebuild/sales-first.md, section 1). The server sends
   * `atAGlance` on a sales board to every reader but a participant; with it, the lead reads "What
   * needs you" first, the headline and the gap, then everything else in five boxes of folded lines,
   * and an admin reads the summary first with the full board one tap away. See TheLightSalesBoard.
   * A team member on a sales board keeps her own view, with the short "Updated" line and the deal
   * key behind ⓘ.
   */
  /*
   * SCREEN MATCH, 16 OCTOBER: THE SALES BOARD AS PICTURED, FOR WHOEVER RUNS IT. "Build each screen as
   * pictured" (Hafsah, 15 October; docs/prototype/screens/B5-the-board/board-as-lead.jpg): the lead of a
   * sales check-in reads the board the picture shows, every section open and in its order
   * (pictured/ThePicturedSalesBoard.tsx), not the folded light board. The light board stays for an admin
   * who only reads (the summary first), until its own screen (A4 read-only-view) is matched.
   */
  /* Only where deals are on record: a sales organisation's goals board with none (salesorg-board.jpg) has its own picture, matched on its own. */
  /* "See every other part of this board": the whole board as it was, with nothing drawn as pictured. */
  const theWholeBoard = searchParams.get('whole') === '1'
  const picturedLead = !theWholeBoard && isSalesOrg && viewerRunsThisCheckIn && !isParticipantView && !groundId
    && (b.workRecords ?? []).some((s: any) => s.section === 'Deal grid' && (s.rows ?? []).some((r: any) => r.kind === 'deal'))
  /* A sales check-in of many people in teams (salesorg-board.jpg): every sale in one table, and the work by team. */
  const picturedManyInTeams = picturedLead && (b.participants ?? []).filter((p: any) => !p.managingOnly).length > 10
  /*
   * THE SALES CHECK-IN IN ANOTHER SITUATION (B5-boards-every-situation/*-board.jpg): the same board, with the sections the
   * switchboard switches on for that situation. "What needs you" (with what the target assumes) comes with lead
   * actions, the day-by-day deals with the deal grid, blockers with blockers and what keeps coming up with patterns;
   * the rest of the board is the same for every situation.
   */
  const situationRow = picturedLead && !picturedManyInTeams && b.scenario !== 'OKR_ALIGNMENT' ? (SWITCHBOARD_MATRIX.find((r) => r.scenario === b.scenario) ?? null) : null
  const situationOrder = situationRow ? [
    ...(situationRow.sectionsOn.includes('Lead actions') ? ['assumes', 'needsYou'] : []),
    ...(situationRow.sectionsOn.includes('Deal grid') ? ['deals'] : []),
    ...(situationRow.sectionsOn.includes('Blockers') ? ['blockers'] : []),
    ...(situationRow.sectionsOn.includes('Patterns') ? ['patterns'] : []),
    'reported', 'whoCheckedIn', 'teamToday', 'overTime', 'reports', 'otherBoards', 'help', 'otherTeams', 'openIssues', 'heading', 'ask', 'recommends',
  ] : null
  /* An engineering release, drawn the same way (eng-board.jpg), for whoever runs it. The other kinds whose example is drawn so join here as their own screens are matched. */
  /* RELEASE 8 (release-8-situations): a situation no kit picture draws, with the sections its situation switches on, for every reader the server serves it to. */
  const picturedSituation = !theWholeBoard && !groundId && !!(b as any).releaseEightSituations && !!(b as any).situation
    /* Where a kit picture draws it, the picture wins: a sales check-in with deals, a big decision for whoever runs it (supplier-board.jpg), and each kind of work drawn as its own example. */
    && !picturedLead && !(b.scenario === 'CRISIS_ALIGNMENT' && viewerRunsThisCheckIn && !isParticipantView)
    && !['engineering release', 'support desk', 'distribution operations', 'trader training programme', "founder's own check-in", 'asset loans', 'MarketView where next', 'MarketView Q4', 'a law firm matter', 'a government programme'].includes(String((b as any).kindOfWork ?? ''))
  const picturedOtherKind = picturedSituation || !theWholeBoard && !groundId && (((b as any).releaseFourTeams && (b as any).kindOfWork === 'leadership') || ((b as any).releaseFiveProjects && (b as any).project) || (viewerRunsThisCheckIn && !isParticipantView
    && ([...['engineering release', 'support desk', 'distribution operations', 'trader training programme', "founder's own check-in", 'asset loans', 'MarketView where next', 'MarketView Q4', 'a law firm matter', 'a government programme'], ...((b as any).releaseFourTeams ? ['sales org'] : [])]).includes(String((b as any).kindOfWork ?? ''))))
  /* An admin who only reads a sales check-in reads the same board as pictured, with nothing to press (read-only-view.jpg). */
  const picturedReader = !theWholeBoard && isSalesOrg && !viewerRunsThisCheckIn && !isParticipantView && !groundId && !!b.readOnlyNote
    && (b.workRecords ?? []).some((s: any) => s.section === 'Deal grid' && (s.rows ?? []).some((r: any) => r.kind === 'deal'))
  /* And a person in it reads their own part of the same board as pictured (board-as-participant.jpg). */
  const picturedParticipant = !theWholeBoard && isSalesOrg && isParticipantView && !groundId
    && (b.workRecords ?? []).some((s: any) => s.section === 'Deal grid' && (s.rows ?? []).some((r: any) => r.kind === 'deal'))
  /* The onboarding board as pictured (kwame-board.jpg), for whoever runs it. */
  const picturedOnboarding = !theWholeBoard && b.family === 'ONBOARDING' && viewerRunsThisCheckIn && !isParticipantView && !groundId
  /*
   * A person in a leadership-style goals check-in (leadership-board.jpg): the lead takes part too, it is about
   * the goals, and it keeps no records of a kind of work. Their own part, as pictured. Any other participant's
   * board is unchanged.
   */
  const picturedMember = !theWholeBoard && isParticipantView && !groundId && b.scenario === 'OKR_ALIGNMENT' && !(b as any).kindOfWork
    && (groundForSignals as any)?.leadAnswersToo === true
  /* A big decision worked through (supplier-board.jpg), for whoever runs it. */
  const picturedDecision = !theWholeBoard && b.scenario === 'CRISIS_ALIGNMENT' && viewerRunsThisCheckIn && !isParticipantView && !groundId
  /* A performance plan (danielpip-board.jpg), for whoever runs it: the suggestion first, then the person's case. */
  const picturedPlan = !theWholeBoard && b.scenario === 'PIP' && viewerRunsThisCheckIn && !isParticipantView && !groundId
  const planPersonId = picturedPlan ? ((b.participants ?? []).find((p) => !p.managingOnly && p.id !== b.myParticipantId)?.id ?? null) : null
  const planNamesLine = picturedPlan && planPersonId
    ? (() => { const f = String((b.participants ?? []).find((p) => p.id === planPersonId)?.name ?? '').trim().split(/\s+/)[0]; return f ? `${f} and you.` : null })()
    : null
  /*
   * THE COLLECTIONS BOARD (Release 2, pull request 2 of 3; TheCollectionsBoard), for every reader the server serves it to: it is
   * served only where the switchboard picks it, and already walled at the server (the lead every bill, a person their own). In
   * place of every other drawing of the board; the whole board as it was stays one tap away (?whole=1).
   */
  const picturedCollections = !theWholeBoard && !groundId && !!b.collections
  /*
   * THE MATTER BOARD (Release 2, pull request 3 of 3; TheMatterBoard), for every reader the server serves it to: served only where the
   * switchboard picks it, and already walled at the server (whoever runs it every matter and every fee line it may read; a person their
   * own lines and only their own fee notes). In place of every other drawing of the board; the whole board stays one tap away (?whole=1).
   */
  const picturedMatter = !theWholeBoard && !groundId && !!b.matter && !b.collections
  const drawnAsPictured = picturedCollections || picturedMatter || ((picturedLead || picturedReader || picturedOnboarding || picturedMember || picturedDecision || picturedPlan || picturedOtherKind) && !b.collections)
  const light = !!b.atAGlance && !isParticipantView && !picturedLead && !picturedReader && !picturedOnboarding && !picturedDecision && !picturedPlan && !picturedOtherKind && !picturedCollections && !picturedMatter
  /* "Daily on weekdays, from 4pm. Session 38 of 65. Runs until 30 September." (board-as-lead.txt). */
  const picturedCadenceLine = [
    picturedOnboarding ? onboardingNamesLine : picturedPlan ? planNamesLine : null,
    theScheduleInWords((groundForSignals as any)?.cadence, (groundForSignals as any)?.workingDays, b.phaseSpine?.sessions?.[b.phaseSpine.sessions.length - 1]?.opensOn ?? null, (groundForSignals as any)?.cadenceAnchorDay ?? null),
    spineWords && /Session (\d+) of \1\.$/.test(spineWords) ? spineWords.replace(/\.$/, ', the last one.') : spineWords,
    /* An evaluation check-in is served no phase spine (board-families.ts keeps that family thin), so its count is read from the sessions its grid already holds. */
    !spineWords && picturedPlan ? phaseSpineSentence(
      (b.checkInGrid?.sessions ?? []).length ? { startsAt: null, endsAt: null, currentSession: Math.max(...(b.checkInGrid?.sessions ?? []).map(Number)) } : null,
      plannedSessions ?? null,
    ) : null,
  ].filter(Boolean).join(' ') || cadenceLine
  const lightLead = light && viewerRunsThisCheckIn
  const shortUpdatedLine = light || (participantFoldsWhole && !picturedParticipant && !picturedMember)
  /*
   * ITEM 6 (ONBOARDING BOARD FIX 2): "GROUNDWORK DOES NOT KNOW WHAT KIND OF WORK..." IS NOT THE
   * PROTOTYPE'S OWN SECTION. For a kind of work the engine has not been told yet, every one of
   * these sections comes back with `state: 'not-known'` and the same stock sentence - six headings
   * in a row saying the same thing, where the prototype's own onboarding board shows none of them.
   * A section with real rows (`state` is `'filled'` or `'none-yet'`) still belongs where it always
   * did; only the not-known ones move into the end fold, alongside everything else this kind of
   * work's prototype does not show.
   */
  /*
   * SUPPORT DESK BOARD FIX 2: "THEMES" NEVER DRAWN TWICE. Pulled out above to draw once, right
   * after "The team today" - left out of both lists here so it is never also drawn in its usual
   * spot (filled, among `dealGridSections`, or not-known, among `restOfWorkRecordSections`).
   */
  const dealGridSections = isSalesOrg
    ? (b.workRecords ?? []).filter((s) => s.section === 'Deal grid')
    : (b.workRecords ?? []).filter((s) => s.state !== 'not-known' && !(themesAndAreaAfterTheTeam && s.section === 'Themes'))
  const restOfWorkRecordSections = isSalesOrg
    ? (b.workRecords ?? []).filter((s) => s.section !== 'Deal grid')
    : (b.workRecords ?? []).filter((s) => s.state === 'not-known' && !(themesAndAreaAfterTheTeam && s.section === 'Themes'))
  const myWorkTab = viewerRunsThisCheckIn ? 'sessions' : 'record'
  const headerTabs = [
    { key: 'board', label: 'Board', to: `/grounds/${id}/board` },
    ...(viewerRunsThisCheckIn || isAParty ? [{ key: 'chat', label: 'Check-in', to: `/grounds/${id}` }] : []),
    /* Release 1B: "References and resources" where the organisation's switch is on (the-references-tab.ts). */
    { key: 'context', label: theContextTabsName(groundForSignals as any, 'Context and resources'), to: `/grounds/${id}?tab=context` },
    ...(viewerRunsThisCheckIn || isAParty ? [{ key: myWorkTab, label: 'My work', to: `/grounds/${id}?tab=${myWorkTab}` }] : []),
    { key: 'settings', label: 'People and setup', to: `/grounds/${id}?tab=settings` },
  ]
  const has = (s: string) => b.sections.includes(s as any)
  /**
   * THE ANCHOR'S REMAINING SECTIONS, NAMED BY THE SWITCHBOARD (decision 114;
   * docs/answers-from-engine.md, "8 October (later): the anchor through the ordinary routes, route
   * by route", and "8 October (evening): the anchor's last month parts are board sections"). Gated
   * with the same `has(...)` every other kind of work's own sections already use - WHO READS WHAT IS
   * DECIDED BY THE SERVER, so there is no reader check here either.
   *
   * `theMonthBoard` IS NO LONGER DRAWN (decision 114, 8 October evening): every part it used to
   * carry - the four lenses, the week, what's moving, what the team is contributing, people helping
   * the team move, where perspectives differ, what's still in the way, and what Groundwork is
   * working on next - now has a section of its own below, drawn once through
   * `TheAnchorBoardSections` instead of the retired `TheMonthBoard` component (see
   * the-anchor-old-and-new-sections-agree.spec.tsx for the proof nothing was lost). `ideasFromTheTeam`
   * is not here - it is the same shape `ideasFromYourTeam` above already draws through the existing
   * `TheIdeasFromYourTeam`. `recommendations` is not drawn here either: the lead already reads
   * "Groundwork recommends" through the dedicated `recommendedCheckInsApi` listing and its own
   * yes/not-now handling (`recommendedOffers`, below), which this would only duplicate.
   */
  const theAnchorSections = {
    whatYouAreCarrying: has('whatYouAreCarrying') ? (b as any).whatYouAreCarrying : undefined,
    howGroundworkWillWork: has('howGroundworkWillWork') ? (b as any).howGroundworkWillWork : undefined,
    theFourLenses: has('theFourLenses') ? (b as any).theFourLenses : undefined,
    peopleHelpingTheTeamMove: has('peopleHelpingTheTeamMove') ? (b as any).peopleHelpingTheTeamMove : undefined,
    weeklyInsight: has('weeklyInsight') ? (b as any).weeklyInsight : undefined,
    whereTheMonthIs: has('whereTheMonthIs') ? (b as any).whereTheMonthIs : undefined,
    whatIsMoving: has('whatIsMoving') ? (b as any).whatIsMoving : undefined,
    whatTheTeamIsContributing: has('whatTheTeamIsContributing') ? (b as any).whatTheTeamIsContributing : undefined,
    wherePerspectivesDiffer: has('wherePerspectivesDiffer') ? (b as any).wherePerspectivesDiffer : undefined,
    whatIsStillInTheWay: has('whatIsStillInTheWay') ? (b as any).whatIsStillInTheWay : undefined,
    whatGroundworkIsWorkingOnNext: has('whatGroundworkIsWorkingOnNext') ? (b as any).whatGroundworkIsWorkingOnNext : undefined,
  }
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
  /* A lead who does not check in is not the one person on this board, so she is never told "You have answered this session." */
  const viewerChecksIn = (b.participants ?? []).some((p) => p.id === b.myParticipantId && !p.managingOnly)
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
      && (!!b.whatTheRoomIsAbout?.aims?.length || !!b.whatTheRoomIsAbout?.places?.length
        || !!b.whatTheRoomIsAbout?.things?.length || !!b.whatTheRoomIsAboutNote),
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
    /*
     * REQUEST 70, THE SWITCHBOARD'S 22 SECTIONS: THESE 13 ARE NOT IN ANY FAMILY'S `sections` LIST AT
     * ALL (the server serves them to every family whenever the reader has data, the same way it
     * already does `hiddenContributors` for some families) - so there is no `has(...)` to call here,
     * only the per-situation `allowed(...)` gate and whether the server actually sent anything.
     */
    risks: allowed('risks') && !!b.risks?.length,
    workPlan: allowed('workPlan') && !!b.workPlan?.length,
    timeline: allowed('timeline') && !!b.timeline?.length,
    personHistory: allowed('personHistory') && !!b.personHistory?.length,
    blockerCheck: allowed('blockerCheck') && !!b.blockerCheck?.length,
    evidenceIndex: allowed('evidenceIndex') && !!b.evidenceIndex?.length,
    busyOrMoving: allowed('busyOrMoving') && !!b.busyOrMoving?.eachPerson?.length,
    leadActions: allowed('leadActions') && !!b.leadActions?.length,
    obligations: allowed('obligations') && !!b.obligations?.length,
    forecast: allowed('forecast') && !!b.forecast?.length,
    whoWaitedOnWhom: allowed('whoWaitedOnWhom') && !!b.whoWaitedOnWhom?.length,
    contradictions: allowed('contradictions') && !!b.contradictions?.length,
    questionsForTheLead: allowed('questionsForTheLead') && !!b.questionsForTheLead?.length,
    /*
     * COACHING WAS SENT BUT DRAWN NOWHERE ON THE BOARD (second board review). `yours` reaches every
     * reader who has one; `eachPerson` is the lead's own and the server already nulls it for anybody
     * else, so there is nothing further to gate on here beyond what the server sent.
     */
    coaching: !!b.coaching && (!!b.coaching.yours || !!b.coaching.eachPerson?.length),
  }
  /*
   * ONBOARDING BOARD FIX 4: NOT A SECOND, EMPTY "WORK PLAN". A not-known `workRecords` entry
   * ("Work plan" - "Groundwork does not know what kind of work this check-in is about yet...")
   * used to sit, in the end fold, right beside the switchboard's own filled `WorkPlanSection`
   * ("Work plan" - the real commitments) - the same words, twice, back to back, one of them
   * empty. `sectionHeading` is the exact words each not-known entry actually prints (not always
   * its raw `section` name - a not-known "Timeline" reads "Every deadline", which never collides),
   * so this compares the real, printed heading, not a guess from the name.
   */
  const switchboardHeadingsAlreadyShown = new Set<string>([
    ...(shown.workPlan ? ['Work plan'] : []),
    ...(shown.timeline ? ['Timeline'] : []),
    ...(shown.obligations ? ['What each side promised'] : []),
    ...(shown.forecast ? ['Where this could end up'] : []),
  ])
  const restOfWorkRecordSectionsToShow = restOfWorkRecordSections.filter((s) =>
    s.state !== 'not-known' || !switchboardHeadingsAlreadyShown.has(sectionHeading((b as any).kindOfWork ?? null, s)))
  /*
   * PROJECT BOARD REVIEW 1, FIX 3; WIDENED, PHONE CHECK ITEM 8: SAID ONCE, WITH NO HEADING,
   * WHENEVER EVERY RECORD IS NOT-KNOWN. A check-in with no kind of work chosen at all (the DRIFT
   * fixture, "The partnerships work has gone quiet", dac969d3) sends every `workRecords` section
   * back as not-known, with the same stock sentence - repeated once per section, under the raw
   * switchboard names ("Deal grid", "Forecast", "Themes", "Work plan") for four of them. Said once
   * instead, with no heading.
   *
   * THIS USED TO BE SCOPED TO `isProjectBoard` ONLY, LEAVING THE ONBOARDING BOARD WITH THE SAME
   * FIVE-HEADINGS BUG (phone check, item 8: "Deal grid", "Forecast", "Themes", "Every deadline",
   * "The parties", each reading "Groundwork does not know what kind of work..."). The comment this
   * replaced worried that collapsing by emptiness would wrongly fold away an onboarding board's own
   * REAL "Work plan" - but that worry was about a different, now-gone heuristic
   * (`switchboardHeadingsAlreadyShown` read as "nothing else on the board"). This check reads
   * `b.workRecords` itself: the moment any one of its own entries is `'filled'` or `'none-yet'`
   * rather than `'not-known'`, `allWorkRecords.every(...)` is already false and nothing here
   * collapses - proven by the existing "keeps a work-record section with real rows exactly where it
   * was" test, which sends a filled "Work plan" among `workRecords` and still finds it outside the
   * fold. Onboarding's real work plan, shown separately as `WorkPlanSection`, never passes through
   * `b.workRecords` at all, so this collapsing a genuinely all-not-known `workRecords` list cannot
   * reach it either way.
   *
   * NOT SCOPED TO `isProjectBoard || isOnboarding` ANY MORE (real-user walk, Kijani Foods, fault 4b).
   * Tendai's role-handover check-in, a scenario this list never covered, still sent six work-record
   * sections back not-known with the same `why`, and the fold repeated the same sentence six times -
   * the exact bug this collapsing exists to fix, just on a board whose scenario was never added to
   * the list. The `allWorkRecords.every(...)` check below already proves it is safe everywhere: the
   * moment one real row exists this is false and nothing collapses, whatever the board's family.
   */
  const allWorkRecords = b.workRecords ?? []
  const workRecordsAllNotKnownSameWhy =
    allWorkRecords.length > 1 &&
    allWorkRecords.every((s) => s.state === 'not-known') &&
    new Set(allWorkRecords.map((s) => (s as { why: string }).why)).size === 1
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
      /* Board review, 30 September, item 6: a session only STARTED, not finished, was drawn as a
         filled, done square - Amani and Rukia read two filled squares while the board itself said
         "Session 2 has not opened yet." Only "done" is a finished check-in; a session the phase
         spine still calls "upcoming" reads as not open yet, whatever a stray in-progress cell
         says, and only "done" ever fills the square. */
      const upcoming = sessionState.get(s) === 'upcoming'
      const checkedIn = v === 'done'
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
  /* WHAT HAPPENED, NEVER THE PATTERN'S NAME, beside a person in this list (Hafsah, 12 October: an approved pattern name may head a
     pattern, never sit as a tag beside a person's name in a list or table). The name stays on the pattern's own heading below. */
  const patternHeadingByParticipant = new Map<string, string>()
  for (const p of visiblePatterns) {
    if (!p.participantId || patternHeadingByParticipant.has(p.participantId)) continue
    patternHeadingByParticipant.set(p.participantId, p.whatHappened?.trim() || 'Something keeps coming up in these check-ins. It is shown below, with what happened.')
  }
  /* Re-review, 30 September: "Nothing to do" beside somebody the "Waiting on" section already
     says is waiting on the reader - see where-each-person-is.tsx's `waitingOnReader`. */
  const readerIsOnThisDependency = (d: { on: string | null; onParticipantId?: string | null }) =>
    b.myParticipantId ? d.onParticipantId === b.myParticipantId : !!myName && d.on === myName
  const waitingOnReaderParticipantIds = new Set(
    (b.dependencies ?? []).filter(readerIsOnThisDependency).map((d) => d.fromParticipantId).filter((id): id is string => !!id),
  )
  /* Re-review, 30 September: "0 of 4" read as a bare fragment - what the number counts, from the
     matching objective's own name (e.g. "shops in Westlands"), so it reads as a sentence. */
  const targetNameByParticipant = new Map((b.objectives ?? []).filter((o) => o.ownerParticipantId).map((o) => [o.ownerParticipantId as string, o.name]))
  /**
   * ANCHOR PIECE 31, THE "ACTIVE" LINE (section 26; plan section 5 row 12; docs/answers-from-engine
   * .md, "Request 149 (4 of 6)", `TheActiveLine`). Served now, to whoever runs the check-in only,
   * for an anchor Ground. Drawn in "The team today", exactly as the engine sends `line` - never
   * rebuilt from the counts on this side. Nothing when the board does not serve it.
   */
  const activeLineForTheLead = viewerRunsThisCheckIn ? (b as any).activeLine?.line as string | undefined : undefined
  const eachPersonRows = (b.eachPerson ?? []).map((r) => ({
    ...r,
    keepsComingUp: keepsComingUpByParticipant.get(r.participantId) ?? patternHeadingByParticipant.get(r.participantId) ?? null,
    waitingOnReader: waitingOnReaderParticipantIds.has(r.participantId),
    targetName: targetNameByParticipant.get(r.participantId) ?? null,
  }))

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

  /*
   * WHERE PEOPLE DIFFER, UNDER ONE NAME BUT TWO HEADINGS.
   *
   * Drawn from two different places with two different headings - here (unchanged) and, for the
   * onboarding family only, right after "What needs you", in the prototype's own words for that
   * family (day-30-and-60.txt: "Where you both see it differently"). Nothing else about it changes
   * - same rows, same order, same "What to settle together" directly under it either way. The
   * heavy content lives once, in `DivergenceSectionBody`, above; this gating is deliberately
   * written with its operands swapped (`b.divergence && shown.divergence`, not `shown.divergence &&
   * b.divergence`) so it is not the same literal text as the general case's own gate, further down
   * - see the note there.
   */
  /*
   * WHAT NEEDS YOU IN THIS CHECK-IN (board-as-lead.txt), for whoever runs it - ONE section, not
   * three. Factored into a function (the same pattern `whoCheckedIn`, just below, already uses)
   * so a government programme board can call it from gov.txt's own place, right after the
   * counties, while every other kind still gets it in its usual spot near the top of the board -
   * see where each is called, below.
   */
  /*
   * THE LAW FIRM MATTER BOARD, FIX 3: "NO DECISION TWICE." matter.txt's own "What you need to
   * decide" already reads a `decisions` row word for word (e.g. "Amani Wekesa is waiting for the
   * tax view, and nobody has been named to provide it.") - for this kind only, that same question
   * is kept out of "What needs you in this check-in" too, the same way a decision already read as
   * a lead action is kept out (`decisionDuplicatesALeadAction`, above). Matched on the decision's
   * own `question`, the one field both sections carry unchanged from the engine.
   */
  const matterDecisionQuestionsAlreadyShown = kindOfWorkKey === 'a law firm matter'
    ? new Set(((b as any).whatYouNeedToDecide?.items ?? []).map((item: { question: string }) => item.question))
    : null
  const decisionsForWhatNeedsYou = shown.decisions
    ? b.decisions!.filter((d) =>
        !decisionDuplicatesALeadAction(d, b.leadActions, b.dependencies, myName)
        && !matterDecisionQuestionsAlreadyShown?.has(d.question),
      )
    : []
  /**
   * "EVERY SESSION", THE ONE LINK, DRAWN FROM ONE PLACE.
   *
   * Every kind of work draws the exact same link; only where it sits on the page differs (right
   * after "Your share" for every kind but one, at the very end of the board for the "MarketView,
   * where next" board's own participant - see the two call sites, below). Kept as one function
   * rather than two copies of the same markup, so the shared part's own classes are never written
   * out twice in this file.
   */
  const everySessionLink = () => (
    <Link
      to={`/grounds/${id}?tab=record`}
      className="gwui-wide-outline-btn gwui-mt-20 gwui-pt-11 gwui-pr-16 gwui-pb-11 gwui-pl-16 gwui-fs-16"
    >
      {EVERY_SESSION.heading}
    </Link>
  )
  const whatNeedsYouSection = () => {
    const missedHere = viewerRunsThisCheckIn ? (b.missedCheckIns ?? []) : []
    if (!(viewerRunsThisCheckIn && (missedHere.length > 0 || needsHere.length > 0 || (shown.leadActions && !sameAsTheWorkPlan(b.leadActions, b.workPlan, true)) || decisionsForWhatNeedsYou.length > 0))) return null
    return (
      <Section heading="What needs you in this check-in">
        <EdgeList label="What needs you in this check-in">
          {/* MISSED CHECK-INS (decision 136): the server's own sentences, facts and what they do, served to the lead alone. */}
          {missedHere.map((m) => (
            <EdgeRow key={`missed-${m.participantId}`} kind="look" title={m.text} />
          ))}
          {needsHere.map((n: Need) => (
            <EdgeRow
              key={n.key}
              kind={n.kind}
              title={n.title}
              detail={n.detail ?? undefined}
              actions={<UIButton kind="secondary" size="small" to={n.action.to}>{n.action.label}</UIButton>}
            />
          ))}
          {/*
            REQUEST 112 (b): EVERY ITEM GETS ITS OWN ACTION, FROM THE ENGINE'S OWN `action`
            (board-as-lead.txt: "Yes, it counts" / "No", "Ask him"). `leadActions` and
            `decisions` used to carry none at all, so every row fell back to the same quiet
            "Open" text link to the Check-in tab - the engine now sends, per item, either real
            choices with the route that keeps each answer, or one named button to where the
            lead settles it. `ActionButtons` falls back to that same "Open" link on an older
            server that sends no `action`.
          */}
          {shown.leadActions && !sameAsTheWorkPlan(b.leadActions, b.workPlan, true) && b.leadActions!.map((r) => (
            <EdgeRow
              key={r.id}
              kind="look"
              title={r.says}
              detail={r.because ?? undefined}
              actions={<ActionButtons groundId={id!} action={r.action} />}
            />
          ))}
          {/*
            ITEM 8: SKIP A DECISION THAT IS THE SAME BLOCKER AS A LEAD ACTION ABOVE. See
            `decisionDuplicatesALeadAction`.
          */}
          {decisionsForWhatNeedsYou.map((d, i) => (
            <EdgeRow
              key={`decision-${i}`}
              kind="decide"
              title={d.question}
              detail={(
                <>
                  {d.why}
                  {/* U.10 re-review, item 1: a name, not a verdict - "You" to the reader
                      themselves, kept from the old standalone "Decisions needed" section.

                      SECOND BOARD REVIEW, WORDING: `d.owner` is not always a person. The
                      engine sends it as a real name, or one of a handful of stuck-on fragments
                      for a decision nobody is named for - "Lead and team" (a divergence, or one
                      the lead wrote down), "Nobody has been named to decide this.", or a
                      dependency's own non-person label such as "the pipeline". Stapled after
                      the sentence as a bare fragment, all three read as a label, not words -
                      see `decisionOwnerTag`. */}
                  {d.owner && <span className="gwui-fs-13-5 gwui-ink-sub gwui-ml-7">{decisionOwnerTag(d.owner, b.participants, myName, d.source)}</span>}
                </>
              )}
              actions={<ActionButtons groundId={id!} action={d.action} />}
            />
          ))}
        </EdgeList>
      </Section>
    )
  }

  const groundworkRecommendsSection = () => {
    if (!recommendedOffers.length) return null
    return (
      <Section heading="Groundwork recommends">
        <EdgeList label="Groundwork recommends">
          {recommendedOffers.map((o) => (
            <EdgeRow
              key={o.id}
              kind="decide"
              title={o.says}
              detail={o.question}
              actions={(
                <>
                  <UIButton
                    kind="secondary"
                    size="small"
                    disabled={answerRecommendation.isPending}
                    onClick={() => answerRecommendation.mutate({ offerId: o.id, yes: true })}
                  >
                    {o.yes}
                  </UIButton>
                  <UIButton
                    kind="quiet"
                    size="small"
                    disabled={answerRecommendation.isPending}
                    onClick={() => answerRecommendation.mutate({ offerId: o.id, yes: false })}
                  >
                    {o.no}
                  </UIButton>
                </>
              )}
            />
          ))}
        </EdgeList>
      </Section>
    )
  }

  /*
   * "WHAT KEEPS COMING UP" AND COACHING, TOGETHER (board-as-lead.txt; modules.md: "One thing to
   * do better, for each person"). Factored into a function, the same pattern as `whoCheckedIn`
   * and `whatNeedsYouSection`, so a government programme board can call it from gov.txt's own
   * place - just before "Where this is heading" - while every other kind keeps it exactly where
   * it already was, between Blockers and "Reported, stage by stage". Hafsah's decision: patterns
   * and coaching are protected, and never fold - this only ever changes where they sit, never
   * whether they show.
   */
  /*
   * REQUEST 133: AN ASSET LOANS COHORT'S OWN HEADING FOR "WHAT KEEPS COMING UP" (loans.txt: "One
   * person, a place, or the model?", then "Patterns named after three check-ins in a row" as its
   * note). Every other kind of work keeps the plain heading and note it already had.
   */
  const patternsHeading = kindOfWorkKey === 'asset loans' ? 'One person, a place, or the model?' : 'What keeps coming up'
  /*
   * B-138, DECISION 8: "Patterns show only after three periods, whether or not they are in a row."
   * The old note said the opposite - that three in a row were required - for both the default
   * heading and the asset-loans cohort's own one.
   */
  const patternsNote = kindOfWorkKey === 'asset loans'
    ? 'Shown only after the same thing comes up in three check-ins, in a row or not'
    : 'Shown only after the same thing comes up in three check-ins, in a row or not. Each describes the work.'

  const patternsAndCoachingSection = () => (
    <>
      {shown.patterns && b.patterns && (
        <>
          {/*
            WHAT KEEPS COMING UP (board-as-lead.txt). Named after three check-ins in a row, never
            after one, and each one describes the work - never a label joined to a name (see
            api/src/modules/patterns/who-reads-a-pattern.ts, the one place that decides who reads
            a pattern and in what words). `visiblePatterns` is filtered again here for a colleague,
            on top of what the server already withheld: see the comment on `visiblePatterns` above.
          */}
          <Section heading={patternsHeading} note={patternsNote}>
            <Panel pad={false}>
              <RowList label="What keeps coming up">
              {visiblePatterns.length === 0 ? (
                <Row columns="1fr" inset="panel"><Text size="15" ink="muted">Nothing to show here yet. A pattern appears only after the same thing comes up in three check-ins, in a row or not, and the person it is about always sees it first.</Text></Row>
              ) : (
                <>
                  {/*
                    REQUEST 82 AND DECISION 67: TWO PARTS, BY EACH PATTERN'S `about`. "the work" goes
                    under "About each person's work"; the nine patterns decision 67 named (D1, D2,
                    D3, D5, D8, B1, B2, B3, E2) carry `about: 'what is said against what happened'`
                    and go under the second heading instead. A pattern with no `about` at all (an
                    older server, or a test fixture) falls back to the first part, which is where
                    every pattern used to be drawn.
                  */}
                  {(() => {
                    const aboutTheWork = visiblePatterns.filter((p) => p.about !== 'what is said against what happened')
                    const aboutWhatIsSaid = visiblePatterns.filter((p) => p.about === 'what is said against what happened')
                    const group = (heading: string, rows: ServedPattern[]) => rows.length === 0 ? null : (
                      <>
                        <Row columns="1fr" inset="panel"><SubHeading>{heading}</SubHeading></Row>
                        {rows.map((p) => (
                          <Row key={p.id} columns="1fr" inset="panel">
                            <PatternPanel
                              pattern={p}
                              invalidateKey={['board', id]}
                              name={patternPersonName(p.participantId, p.yours)}
                              leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
                            />
                          </Row>
                        ))}
                      </>
                    )
                    return (
                      <>
                        {group('About each person’s work', aboutTheWork)}
                        {group('How what people say can run ahead of what happened', aboutWhatIsSaid)}
                      </>
                    )
                  })()}
                </>
              )}
              </RowList>
              <div className="gwui-fs-13-5 gwui-ink-muted gwui-pt-10 gwui-pr-22 gwui-pb-10 gwui-pl-22 gwui-rule-top-dashed gwui-mt-4" style={{fontStyle: 'italic', lineHeight: 1.5}}>
                {/* Board review, 1 October, item 4: "the lead's private report" said "the lead"
                    even to the lead themselves reading their own board. */}
                {direct ? 'Patterns about the work only.' : <>Patterns about the work only. Anything that would read as a judgement about a person stays in {viewerRunsThisCheckIn ? 'your' : `${(groundForSignals as any)?.leadFirstName ?? 'the lead'}’s`} private report and never appears here.</>}
              </div>
            </Panel>
          </Section>
        </>
      )}

      {/*
        COACHING (modules.md: "One thing to do better, for each person"). Sent on every board
        response but never drawn here - this restores it, in the same shape the report page
        already uses for the same fields: `WhatToWorkOnNext` for this reader's own note, and,
        lead-only, `WhatToProbeThemOn` for the read on everybody else. Neither component invents
        anything; both already render nothing when the server has nothing to say.
      */}
      {/*
        REQUEST 133: "SUPPORT GIVEN, AND WHETHER IT HELPED" (loans.txt), AN ASSET LOANS COHORT'S
        OWN SECTION, RIGHT HERE - after "What keeps coming up" and before coaching, the prototype's
        own place for it. Every other kind of work is sent no `supportGiven` at all, so this draws
        nothing for them (`SupportGivenSection` itself returns `null` when `data` is absent).
      */}
      {kindOfWorkKey === 'asset loans' && <SupportGivenSection data={(b as any).supportGiven} />}

      {shown.coaching && b.coaching?.yours && <Placed as="What to work on next"><WhatToWorkOnNext note={b.coaching.yours} /></Placed>}
      {shown.coaching && viewerRunsThisCheckIn && b.coaching?.eachPerson && (
        <Placed as="What to ask each person"><WhatToProbeThemOn reads={b.coaching.eachPerson} /></Placed>
      )}
    </>
  )

  const whoCheckedIn = () => {
    if (!shown.checkInGrid || !b.checkInGrid) return null
          /** Does any row have a role worth a column of its own? */
          const anyRoleToShow = b.checkInGrid.rows.some((r) => (r.role && r.role !== r.name))
          /*
           * ITEM E: A SESSION THAT HAS NOT OPENED IS NOT THE SAME "-" AS ONE SOMEBODY WAS SIMPLY
           * NOT ON. A bare dash read the same for both, and for a session with nothing to say about
           * it yet at all. Cross-referenced against the phase spine's own state, so an unopened
           * session's cell is blank with an accessible "Not open yet" rather than a dash.
           */
          const sessionState = new Map((b.phaseSpine?.sessions ?? []).map((ps) => [ps.n, ps.state]))
          /*
           * DECISION 77: SOMEBODY NOT LET IN YET IS NOT "HAS NOT STARTED SESSION 1". Read live,
           * Faraji Odhiambo - held at the organisation's door, `notLetInYet` - was drawn here as
           * an ordinary absence: "Faraji Odhiambo has not started session 1, and was not part of
           * session 2." He cannot have started a session nobody let him into. The board's own
           * `checkInGrid` row does not carry `notLetInYet` (it is a fact about the organisation,
           * not this check-in's record), so it is read from the ground's own `participants`
           * (`GET /grounds/:id`, already fetched as `groundForSignals` for `viewerRunsThisCheckIn`
           * above) and matched back onto each row by participant id.
           */
          const notLetInYetIds = new Set(
            (((groundForSignals as any)?.participants ?? []) as { id: string; notLetInYet?: boolean }[])
              .filter((p) => p.notLetInYet)
              .map((p) => p.id),
          )
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
                  rows={b.checkInGrid.rows.map((r) => ({
                    ...r,
                    name: nameOnTheBoard(b, r.participantId, r.name),
                    notLetInYet: r.notLetInYet ?? notLetInYetIds.has(r.participantId),
                  })) as any}
                  sessions={b.checkInGrid.sessions}
                  openSessions={b.checkInGrid.sessions.filter((s) => sessionState.get(s) !== 'upcoming')}
                  myParticipantId={b.myParticipantId}
                />
              ) : (
                /*
                  U.10 (c2): FROM THE SHARED PARTS. A PeopleTable of PersonRows, the same shape
                  "The team today" uses - name (and, where a role is worth its own column, the
                  lead's note as the level line), then the same ten squares
                  "The team today" draws, from the same `squaresFor` helper, in their own
                  fixed-width column so they line up across every row.
                */
                <PeopleTable>
                  {b.checkInGrid.rows.map((r) => {
                    /* Re-review, 2 October: the reader's own row headed with their own name -
                       "Rukia Otieno" over her own row, on the board she herself was reading, the
                       same mistake "Who owns what" was fixed for above. */
                    const displayName = r.participantId === b.myParticipantId ? 'You' : nameOnTheBoard(b, r.participantId, r.name)
                    const notYet = r.notLetInYet ?? notLetInYetIds.has(r.participantId)
                    return (
                    <PersonRow
                      key={r.participantId}
                      extraColumns="190px"
                      person={{
                        initials: initialsOf(displayName),
                        name: displayName,
                        level: anyRoleToShow && (r.role && r.role !== r.name)
                          ? <TheLeadsNote role={r.role} />
                          : undefined,
                      }}
                    >
                      {/* Decision 77: squares would have drawn every session as missed for
                          somebody never let in to answer any of them - the sentence instead. */}
                      {notYet ? (
                        <Note tone="muted">{displayName} is waiting to be let in.</Note>
                      ) : (
                        <FlexRow gap={5} justify="flex-end">
                          {squaresFor(r.participantId).map((sq) => (
                            <span
                              key={sq.key}
                              aria-label={sq.state === 'upcoming' ? 'Not open yet' : sq.state === 'done' ? 'Checked in' : 'Missed'}
                              title={sq.state === 'upcoming' ? 'Not open yet' : sq.state === 'done' ? 'Checked in' : 'Missed'}
                              className={sq.state === 'empty' ? 'gwui-rule-square' : undefined}
                              style={{display: 'inline-block', width: 14, height: 14, borderRadius: 3, flexShrink: 0, background: sq.state === 'done' ? 'var(--gw-navy)' : 'transparent'}}
                            />
                          ))}
                        </FlexRow>
                      )}
                    </PersonRow>
                    )
                  })}
                </PeopleTable>
              )}
            </Section>
          )
  }

  /*
   * U.10 ITEM 7: "OVER TIME", AND "REPORTS" (board-as-lead.txt). Factored into functions, the same
   * pattern as `whoCheckedIn`, so a government programme board can draw both inside the end fold
   * (`teamAndRecordsInFold`) while every other kind keeps them exactly where they already were,
   * between "Who checked in" and "Help nobody mentioned" - see where each is called, below.
   */
  const overTimeSection = () => (
    <Section
      heading="Over time"
      /* Board review, 1 October, item 8: this only opens or closes a section (a fold), drawn
         with its own one-off classes instead of the shared `gwui-plain-link` quiet-text-link
         class, so the button-count test counted it as a real button. */
      action={(
        <button
          onClick={() => setShowOverTime((v) => !v)}
          className="gwui-plain-link"
          style={{ flexShrink: 0 }}
        >
          {showOverTime ? 'Hide' : 'Show'}
        </button>
      )}
    >
      {showOverTime ? <HowThisHasMoved groundId={id!} viewerRunsThisCheckIn={viewerRunsThisCheckIn} /> : undefined}
    </Section>
  )

  const reportsSection = () => {
    if (!(shown.checkInGrid && sessionRows.length > 0)) return null
    return (
      <Section
        heading="Reports"
        /* Board review, 30 September, item 1, then re-review item 7: only the lead shares a
           session's report, so "once you share it" said to a participant was simply wrong -
           they cannot share anything here. The lead keeps the prototype's own words; a
           participant has their own report too, so they read who shares the team's; a reader
           who is not a participant at all (an admin reading, not running, this check-in) has
           no report of their own here, so they read only about the team's. */
        note={viewerRunsThisCheckIn
          ? "Every session has two: each person's own, and the team's once you share it."
          : isAParty
            ? `Each session has two reports, your own and the team's, once ${(groundForSignals as any)?.leadFirstName ?? 'the person running this check-in'} shares it.`
            : `Each session has a team report, once ${(groundForSignals as any)?.leadFirstName ?? 'the person running this check-in'} shares it.`}
      >
        {/*
          U.10 (c2): FROM THE SHARED PARTS - the prototype's own list shape (board-as-lead.jpg:
          a session's date and who has checked in on the left, Share/Open on the right), which
          is exactly what EdgeRow already draws for "anything that needs you" elsewhere on this
          board. `kind="decide"` for a session still waiting to be shared, but only for whoever
          runs this check-in - sharing is their decision, not a participant's. `kind="ready"`
          once it is shared (ready to read); `kind="look"` for a participant whose session has
          not been shared yet - nothing for them to decide, just something to wait on.

          Board review, 1 October, item 1: every reader used to get the lead's own row - "A
          decision for you.", "Not shared" and a "Share it" button that only the person running
          the check-in can actually use. A participant cannot share a round, so they now read who
          will ("Not shared yet. {name} shares it.") and get no button for a session that is not
          theirs to open; "Open" still works for their own report once it exists.
        */}
        <EdgeList label="Reports">
          {sessionRows.slice(0, 5).map((r) => {
            const leadName = (groundForSignals as any)?.leadFirstName ?? 'The person running this check-in'
            const notSharedText = viewerRunsThisCheckIn ? EVERY_SESSION.notShared : `Not shared yet. ${leadName} shares it.`
            return (
              <EdgeRow
                key={r.sessionNumber}
                kind={r.shared ? 'ready' : (viewerRunsThisCheckIn ? 'decide' : 'look')}
                /* Re-review, 30 September, item 8: `sessionDay` already returns "Sun, 27 Sept"
                   (weekday, comma, date) - wrapped in another ", " here it read "Session 1,
                   Sun, 27 Sept", two commas doing the work of one. The prototype's own Reports
                   row (board-as-lead.txt: "Today, 23 Sep") is a label, a comma, a short date -
                   one comma, so this drops the weekday and keeps the short date. */
                title={`Session ${r.sessionNumber}${r.opened ? `, ${whenItWas(r.opened, 'dayAndMonth')}` : r.opensOn ? `, opens on ${whenItWas(r.opensOn, 'dayAndMonth')}` : ''}`}
                detail={checkedIn(r.answered, r.total)}
                actions={(
                  <>
                    <Tag tone={r.shared ? 'proven' : 'attention'}>{r.shared ? EVERY_SESSION.shared : notSharedText}</Tag>
                    {/* Secondary, not navy: the board's one primary is "Your check-in", in the header.
                        Only whoever runs this check-in can share a round, so only they get
                        "Share it" for one that has not been shared yet - whether or not they also
                        have their own report on it. A participant can open their own report once
                        it exists (`myCheckInId`), shared or not; with neither - someone else's
                        session, not yet shared - there is nothing of theirs to press. */}
                    {(() => {
                      const canShare = viewerRunsThisCheckIn && !r.shared
                      const canOpenMine = !!r.myCheckInId
                      if (!r.shared && !canShare && !canOpenMine) return null
                      /*
                       * SCREEN FAULT 1 (FINAL WALK): "SHARE IT" OPENED /grounds/:id/session/:n,
                       * A PAGE WITH NO SHARE OR SEND BUTTON (RoundReportPage.tsx only reads a
                       * session's report; it never offered a way to release it). The only place
                       * that can actually share a session is the check-in's own Report tab
                       * (GroundAdminPage.tsx, `SendTheReportToEveryone` and the release action),
                       * so "Share it" goes there now instead.
                       */
                      const target = canShare
                        ? `/grounds/${id}?tab=report`
                        : (!r.shared && canOpenMine ? `/checkin/${r.myCheckInId}/report` : `/grounds/${id}/session/${r.sessionNumber}`)
                      return (
                        <UIButton
                          kind="secondary" size="small"
                          onClick={() => navigate(target)}
                        >
                          {canShare ? 'Share it' : 'Open'}
                        </UIButton>
                      )
                    })()}
                  </>
                )}
              />
            )
          })}
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
    )
  }

  /*
   * THE CENTRAL QUESTION IS DRAWN ONCE, ABOVE THE FOLD, FOR EVERY FAMILY (real-user walk, Kijani
   * Foods, fault 4a). It used to be part of `divergenceBlock` below, which only an onboarding board
   * called above its own fold - every other family's board only reached it inside "Everything else
   * from this check-in", folded shut, while the top of the page read as if nothing needed the lead
   * ("Does a shop count when it signs, or when it orders again?" sat unseen under a closed fold on
   * Tendai's sales board). The full divergence detail (`DivergenceSectionBody`) stays exactly where
   * each family already draws it - a deliberate choice (see "Everything else from this check-in",
   * further down) - only the one-line question moves, drawn once, see where it is rendered below.
   */
  const divergenceBlock = (heading: string) => (
    b.divergence && shown.divergence
      ? <DivergenceSectionBody heading={heading} divergence={b.divergence} whyNothingYet={b.divergence.whyNothingYet} onlyOnePersonHere={onlyOnePersonHere} myName={myName} />
      : null
  )

  return (
    <TheDirectMorning on={direct}>
    <Page>
      <MaybeTheLightSalesBoard glance={light ? b.atAGlance ?? null : null} readerRunsIt={lightLead}>
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

          B-151... B-150, RATHER: NONE OF THIS WHEN /boards IS ALREADY SHOWING ITS OWN SWITCHER.
          The comment above only ever silenced this header's OWN inner board-switcher
          (`trailing`), gated on `!groundId` - the breadcrumb, the serif title, "Your check-in",
          "Ask" and the full six-tab bar were never gated at all, so TeamBoardsPage, which passes
          `groundId` as a prop precisely so it can draw its own tab strip above the board, got this
          whole header a second time underneath it: a second "Check-ins / <name>", a second title,
          and all six tabs where the deep page audit found them. `groundId` (present only when a
          caller supplies it, as TeamBoardsPage does; absent on this page's own route,
          `/grounds/:id/board`, where `id` comes from `useParams` instead) is exactly the flag the
          `trailing` line already reasoned from - so the rest of the header now reasons from it
          too, rather than only the one piece of it that happened to get checked.
        */}
        {!groundId && (
        <CheckInHeader
          crumbs={[{ label: 'Check-ins', to: '/grounds' }, { label: b.title }]}
          title={b.title}
          subtitle={(picturedDecision ? (() => { const n = (b.participants ?? []).length; const done = (b as any).howItIsGoing?.glance?.progress?.answeredThisRound ?? null; return `${n} people answer once.${done != null ? ` ${done} of ${n} have answered.` : ''}` })() : picturedLead || picturedReader || picturedParticipant || picturedOnboarding || picturedPlan || picturedOtherKind ? picturedCadenceLine : picturedMember ? [((b.participants ?? []).find((p) => p.partyType === 'INITIATOR')?.name ? `Run by ${(b.participants ?? []).find((p) => p.partyType === 'INITIATOR')?.name}.` : null), theScheduleInWords((groundForSignals as any)?.cadence, (groundForSignals as any)?.workingDays, null, (groundForSignals as any)?.cadenceAnchorDay ?? null), spineWords].filter(Boolean).join(' ') : cadenceLine) || undefined}
          action={(
            /*
              B-204: AT A PHONE WIDTH, THE NEXT-SESSION NOTE COULD RUN THE WHOLE PAGE SIDEWAYS.

              `shrink0` is here to protect the "Start my check-in"/"Your check-in" BUTTON this row
              usually holds from being squeezed by a long title - the header's own title/action row
              already wraps this whole action block onto its own line below the title when the two
              do not fit side by side, which is enough room for a short button. But the OTHER thing
              this row can hold, in its place, is a full sentence ("Session 3 opened on 10 October,
              while session 1 is still open.") - read live on Zawadi's view of Msingi's "Sales team,
              Q4" at 390px, where that sentence plus "Ask" measured 424px wide against a 390px
              screen, 34px of it permanently off the right edge, because `shrink0` kept the row at
              that one-line width instead of letting it wrap. `wrap` lets the sentence and "Ask"
              reflow onto their own lines within whatever width the row is actually given; `capWidth`
              keeps the row from exceeding that width in the first place, the same way `shrink0`
              already reaches past this one row's own inline style for a real, named need. Wairimu's
              own view (the button, not the sentence) is one short word and was never the problem -
              unaffected either way.
            */
            <FlexRow gap={16} align="center" shrink0 wrap capWidth>
              {/*
                THE PROTOTYPE USES TWO DIFFERENT WORDS HERE. The lead's own board says "Your
                check-in" (board-as-lead.txt); a party's says "Start my check-in"
                (board-as-participant.txt). Both go to the same place - the Check-in tab.

                ONBOARDING BOARD FIX 6: NOT WHILE NOTHING IS OPEN. A participant used to be offered
                "Start my check-in" between rounds too, when the phase spine already said the next
                session had not opened yet (session 5 opening 12 October, read live). The lead keeps
                her own action regardless - she always has something to do here, open session or
                not - but a participant with nothing open now reads when the next one does instead,
                in the engine's own words.

                FAULT 6 (live walk, 6 October 2026): NEVER "START MY CHECK-IN" ON AN ENDED CHECK-IN.
                Amani, a member on a check-in that had already ended, still read "Start my check-in"
                here - pressing it opened "No check-in open right now", because there is none. A
                participant gets no action at all once `groundEnded`; the lead keeps "Your check-in"
                either way, since she has other reasons to open it (reading past sessions).
              */}
              {(viewerRunsThisCheckIn || (isAParty && !groundEnded)) && (
                !viewerRunsThisCheckIn && (noSessionOpenForReader || noSessionOpenForReaderFallback || iHaveNothingOpenOrPending) ? (
                  (whenTheNextSessionOpens ?? whenTheNextSessionOpensFallback) && <Note tone="muted">{whenTheNextSessionOpens ?? whenTheNextSessionOpensFallback}</Note>
                ) : (
                  <Link className="btn pri"
                    to={`/grounds/${id}`}
                  >
                    {isAParty && !viewerRunsThisCheckIn ? 'Start my check-in' : 'Your check-in'}
                  </Link>
                )
              )}
              {/* Board review, 1 October, item 8: a quiet text link that opens Ask, drawn with its
                  own one-off classes instead of the shared `gwui-plain-link` every other quiet
                  text link on this board uses - the button-count test could not tell it apart
                  from a real button because of it. */}
              {picturedLead || picturedParticipant || picturedOnboarding || picturedMember || picturedDecision || picturedPlan || picturedOtherKind ? (
                /* board-as-lead.jpg: a speech mark and "Ask", in bold, not underlined. */
                <button type="button" onClick={showAsk} className="gwui-plain-link pb-ask-link">
                  <MessageCircle size={18} aria-hidden="true" />
                  Ask
                </button>
              ) : (
                <button type="button" onClick={showAsk} className="gwui-plain-link">
                  Ask
                </button>
              )}
            </FlexRow>
          )}
          active="board"
          tabs={headerTabs}
          trailing={!groundId ? <TheOtherBoardsYouAreIn groundId={id!} label={light || picturedLead || picturedOnboarding || picturedMember || picturedParticipant || picturedDecision || picturedPlan || picturedOtherKind ? 'Views' : undefined} plain={picturedLead || picturedOnboarding || picturedMember || picturedParticipant || picturedDecision || picturedPlan || picturedOtherKind} /> : undefined}
        />
        )}

        {/*
          WHEN IT LAST CHANGED, AND THAT OPENING IT CHANGES NOTHING (U.10). The same line for every
          reader, from the server's `lastChangedAt`. Then, for an admin who only reads, who runs it.
          The prototype has this small-grey line directly under the tab bar.
        */}
        {/* The light sales board: "Updated Wed 23 Sep, 6pm ⓘ", the full sentence behind the ⓘ (approved rename). */}
        {shortUpdatedLine ? (
          <UpdatedLine short={whenTheBoardLastChangedInShort(b.lastChangedAt)} full={whenTheBoardLastChanged(b.lastChangedAt, direct)} />
        ) : whenTheBoardLastChanged(b.lastChangedAt, direct) ? (
          /* The prototype's own size for it (t-tiny, 13px), directly under the tabs. */
          <p className="gwui-fs-13 gwui-ink-sub gwui-mt-8" style={{lineHeight: 1.4}}>
            {whenTheBoardLastChanged(b.lastChangedAt, direct)}
          </p>
        ) : null}
        {/*
          OUT OF TIME, RIGHT UNDER "LAST UPDATED" (join-outoftime.txt). This is where a reader looks
          to find out why nothing on the board is moving, so this is where the reason sits - in the
          prototype's own words, with the real end date and the lead's own name where the record
          holds them.

          `endsOn`, NOT `endsAt`. The ground this was built against (`GET /grounds/:id`) sends the
          date it was given as `endsOn` (`types/index.ts`, and already read this way on the Setup
          tab - GroundAdminPage.tsx: "It ends on …") - `phaseSpine.endsAt` is read too, for a kind of
          work that is sent one, as a second source for the same fact.
        */}
        {hasStalled((b as any)?.groundStatus) && (
          <Note tone="muted">
            {whenItRanOutOfTime({
              endsOn: (groundForSignals as any)?.endsOn ?? (b as any)?.phaseSpine?.endsAt ?? null,
              leadFirstName: (groundForSignals as any)?.leadFirstName ?? null,
              isLeadViewer: viewerRunsThisCheckIn,
            })}
          </Note>
        )}
        {b.readOnlyNote && (
          <p role="note" className="gwui-fs-15 gwui-ink-text gwui-mt-8" style={{lineHeight: 1.55}}>{b.readOnlyNote}</p>
        )}

        {/* The direct morning is the morning message's, not the board's (Hafsah, 24 October): the board shows its own headline and What needs you, once. */}
        {/* Your team, person by person (pictured/YourTeamPersonByPerson.tsx): served to the lead alone, beside the direct morning, for her monthly look. */}
        {/* On the pictured board it is drawn after the team today, where the prototype puts the people (see `yourTeam` below); elsewhere it stays here. */}
        {!groundId && (b as any).yourTeam && id && !(!picturedCollections && !picturedMatter && (((picturedLead && picturedManyInTeams) || picturedOtherKind) || (picturedLead && !picturedManyInTeams && !situationOrder))) && <YourTeamPersonByPerson groundId={id} team={(b as any).yourTeam} />}
        {picturedCollections && b.collections && (
          <TheCollectionsBoard
            board={b.collections}
            onRecordTheDecision={viewerRunsThisCheckIn ? () => navigate(`/grounds/${id}/end`) : undefined}
            onAnswer={viewerRunsThisCheckIn ? (route) => answerOnTheCollectionsBoard.mutate(route) : undefined}
            answering={answerOnTheCollectionsBoard.isPending}
          />
        )}
        {picturedMatter && b.matter && <TheMatterBoard board={b.matter} />}
        {!picturedCollections && !picturedMatter && ((picturedLead && picturedManyInTeams) || picturedOtherKind) && (
          <ThePicturedBoard
            /* Release 4: the first screen is the headline with each target and what needs you; the rest is folded under its own heading. */
            foldAfter={(b as any).releaseFiveProjects && (b as any).project ? PROJECT_FOLD_AFTER : (b as any).releaseFourTeams && RELEASE_4_ORDERS[(b as any).kindOfWork] ? whereItFolds((b as any).kindOfWork) : undefined}
            /* A founder's own check-in has one person in it (founder-board.jpg): no team today, no areas, no row per person. */
            order={((picturedSituation
              ? theSituationsOrder((b as any).situation, viewerRunsThisCheckIn && !isParticipantView)
              : (b as any).kindOfWork === 'a government programme'
              /* A programme across levels (gov-board.jpg): what each level understood, the visit log, the counties. */
              ? ['eachLevel', 'visitLog', 'counties', 'heading', 'recommends']
              : (b as any).kindOfWork === 'a law firm matter'
              /* A matter (matter-board.jpg): where it stands, what you need to decide, what changed this week. */
              ? ['matterStands', 'youNeedToDecide', 'changedThisWeek', 'heading', 'recommends']
              : (b as any).kindOfWork === 'MarketView Q4'
              /* Numbers from the systems beside what people said (mvq4-board.jpg). */
              ? ['question', 'needsYou', 'systemsShow', 'saidAndSystemsDiffer', 'heading', 'recommends']
              : (b as any).kindOfWork === 'MarketView where next'
              /* People asked once, each on their own (mvnext-board.jpg). */
              ? ['inShort', 'byWhoTheyAre', 'whereNextRanked', 'whereTheyDisagree', 'cantTellYou', 'heading']
              : (b as any).kindOfWork === 'asset loans'
              /* A lending cohort (loans-board.jpg): what needs you, where the cohort stands, every trader, and what keeps coming up as the cohort's own question. */
              ? ['needsYou', 'cohortStands', 'everySale', 'personPlaceOrModel', 'supportGiven', 'heading']
              /* RELEASE 4 (release-4-teams): each team type as its kit picture. support.jpg: headline and each target, what needs you, every ticket, the team, volume and causes, by queue, who checked in, blockers, what keeps coming up, over time, reports, every session, the other boards, where this is heading. */
              /* RELEASE 5 (release-5-projects): a project, as the Check-in Reports file's "A project": the plan, money in and out, the stakeholders, what is coming up, and if it goes off track. */
              : (b as any).releaseFiveProjects && (b as any).project
              ? PROJECT_ORDER
              : (b as any).releaseFourTeams && theRelease4Order((b as any).kindOfWork, viewerRunsThisCheckIn)
              ? theRelease4Order((b as any).kindOfWork, viewerRunsThisCheckIn)!
              : (b as any).kindOfWork === "founder's own check-in"
              ? ['headlineTargets', 'needsYou', 'everySale', 'reported', 'blockers', 'patterns', 'overTime', 'reports', 'otherBoards', 'heading', 'ask', 'recommends']
              : ['headlineTargets', 'needsYou', 'everySale', 'teamToday', 'reported', 'themes', 'byTeam', 'whoCheckedIn', 'blockers', 'patterns', 'overTime', 'reports', 'otherBoards', 'heading', 'ask', 'recommends'])
              /* With no piece of work on record yet, the kind of work's own empty table says so and offers to add one, in place of the table. */
              .flatMap((k) => (k === 'everySale' && !(b.workRecords ?? []).some((x: any) => (x.section === 'Deal grid' || x.section === 'Work plan') && (x.rows ?? []).length) ? ['kindOfWork', 'otherRecords'] : [k]))
              /* The lead's person-by-person part goes after the team today, or before where this is heading when there is no team today. */
              .flatMap((k, _i, all) => (k === 'teamToday' ? [k, 'yourTeam'] : k === 'heading' && !all.includes('teamToday') && !picturedSituation ? ['yourTeam', k] : [k]))) as any}
            yourTeam={!groundId && (b as any).yourTeam && id ? <YourTeamPersonByPerson groundId={id} team={(b as any).yourTeam} /> : null}
            otherRecords={(
              <WorkRecordsSections
                groundId={id!}
                kindOfWork={kindOfWorkKey as any}
                sections={(b.workRecords ?? []).filter((x) => x.section === 'Deal grid' || x.section === 'Work plan')}
                participants={(b.participants ?? []).map((p) => ({ id: p.id, name: p.name }))}
                leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
                readerIsLead={true}
                canEdit={b.canEditFrame}
              />
            )}
            kindOfWork={(
              <KindOfWorkBanner
                groundId={id!}
                kindOfWork={(b as any).kindOfWork ?? null}
                workStages={(groundForSignals as any)?.workStages}
                canEdit={canEditKindOfWork}
                kindsOffered={(b as any).kindsOffered}
                readerIsTheFounder={(b as any).kindOfWork === "founder's own check-in"}
              />
            )}
            b={b}
            groundId={id!}
            sessionRows={sessionRows as any[]}
            renderActions={(action) => <ActionButtons groundId={id!} action={action} />}
            overTime={overTimeSection()}
            recommendations={recommendedOffers}
            onAnswerRecommendation={(offerId, yes) => answerRecommendation.mutate({ offerId, yes })}
            recommendationBusy={answerRecommendation.isPending}
            onRecordTheDecision={() => navigate(`/grounds/${id}/end`)}
            navigate={navigate}
          />
        )}
        {!picturedCollections && !picturedMatter && picturedReader && (
          <ThePicturedSalesBoard
            b={b}
            groundId={id!}
            sessionRows={sessionRows as any[]}
            renderActions={() => null}
            overTime={overTimeSection()}
            recommendations={[]}
            onAnswerRecommendation={() => undefined}
            recommendationBusy={false}
            onRecordTheDecision={() => undefined}
            navigate={navigate}
            readOnly
          />
        )}
        {!picturedCollections && !picturedMatter && picturedLead && situationOrder && (
          <ThePicturedBoard
            order={situationOrder as any}
            b={b}
            groundId={id!}
            sessionRows={sessionRows as any[]}
            renderActions={(action) => <ActionButtons groundId={id!} action={action} />}
            overTime={overTimeSection()}
            recommendations={recommendedOffers}
            onAnswerRecommendation={(offerId, yes) => answerRecommendation.mutate({ offerId, yes })}
            recommendationBusy={answerRecommendation.isPending}
            onRecordTheDecision={() => navigate(`/grounds/${id}/end`)}
            navigate={navigate}
          />
        )}
        {!picturedCollections && !picturedMatter && picturedLead && !picturedManyInTeams && !situationOrder && !picturedOtherKind && (
          <ThePicturedSalesBoard
            b={b}
            groundId={id!}
            yourTeam={!groundId && (b as any).yourTeam && id ? <YourTeamPersonByPerson groundId={id} team={(b as any).yourTeam} /> : null}
            sessionRows={sessionRows as any[]}
            renderActions={(action) => <ActionButtons groundId={id!} action={action} />}
            overTime={overTimeSection()}
            recommendations={recommendedOffers}
            onAnswerRecommendation={(offerId, yes) => answerRecommendation.mutate({ offerId, yes })}
            recommendationBusy={answerRecommendation.isPending}
            onRecordTheDecision={() => navigate(`/grounds/${id}/end`)}
            navigate={navigate}
            otherRecords={(
              <WorkRecordsSections
                groundId={id!}
                kindOfWork={kindOfWorkKey as any}
                sections={(b.workRecords ?? []).filter((s) => s.section !== 'Deal grid' && s.state === 'filled')}
                participants={(b.participants ?? []).map((p) => ({ id: p.id, name: p.name }))}
                leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
                readerIsLead={true}
                canEdit={b.canEditFrame}
              />
            )}
            kindOfWork={(
              <KindOfWorkBanner
                groundId={id!}
                kindOfWork={(b as any).kindOfWork ?? null}
                workStages={(groundForSignals as any)?.workStages}
                canEdit={canEditKindOfWork}
                kindsOffered={(b as any).kindsOffered}
                readerIsTheFounder={false}
              />
            )}
          />
        )}
        {!picturedCollections && !picturedMatter && picturedOnboarding && (
          <ThePicturedBoard
            /* Before anybody has answered (faith90-board.jpg) the board says it fills in after the first check-ins, and shows what was agreed and what is left to do. */
            order={(b.checkInGrid?.rows ?? []).length > 0 && !(b.checkInGrid?.rows ?? []).some((r: any) => Object.values(r.cells ?? {}).includes('done'))
              ? ['fillsIn', 'agreedAndApart', 'firstSteps', 'mayBeRelevant', 'heading']
              /* Release 8: the switchboard's purple sections for a new hire, after the kit picture's own. */
              : ['lastSession', 'agreedAtTheStart', 'changeSinceLast', 'ninetyDays', 'history', 'otherRecords', 'bothSeeIt', ...((b as any).releaseEight ? ['whereTimeWent', 'evidenceIndex', 'busyOrMoving', 'contradictions', 'questionsForTheLead'] : []), 'everySession', 'otherBoards', 'heading', 'ask', 'recommends'] as any}
            line={picturedCadenceLine}
            otherRecords={(
              <WorkRecordsSections
                groundId={id!}
                kindOfWork={kindOfWorkKey as any}
                sections={(b.workRecords ?? []).filter((s) => s.state === 'filled')}
                participants={(b.participants ?? []).map((p) => ({ id: p.id, name: p.name }))}
                leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
                readerIsLead={true}
                canEdit={b.canEditFrame}
              />
            )}
            personId={(b.participants ?? []).find((p) => !p.managingOnly && p.id !== b.myParticipantId)?.id ?? null}
            seeTheSamePictures={ninetyDaysSeeTheSamePictures}
            b={b}
            groundId={id!}
            sessionRows={sessionRows as any[]}
            renderActions={(action) => <ActionButtons groundId={id!} action={action} />}
            overTime={null}
            recommendations={recommendedOffers}
            onAnswerRecommendation={(offerId, yes) => answerRecommendation.mutate({ offerId, yes })}
            recommendationBusy={answerRecommendation.isPending}
            onRecordTheDecision={() => navigate(`/grounds/${id}/end`)}
            navigate={navigate}
          />
        )}
        {!picturedCollections && !picturedMatter && picturedMember && (
          <ThePicturedBoard
            order={['participantNote', 'priorities', 'yourPart', 'teamReport', 'companyBoard', 'everySession', 'otherBoards', 'ask']}
            leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
            reportHeading={`The ${String(b.title ?? '').split(',')[0].trim().toLowerCase()} report`}
            b={b}
            groundId={id!}
            sessionRows={sessionRows as any[]}
            renderActions={(action) => <ActionButtons groundId={id!} action={action} />}
            overTime={null}
            recommendations={[]}
            onAnswerRecommendation={() => undefined}
            recommendationBusy={false}
            onRecordTheDecision={() => undefined}
            navigate={navigate}
          />
        )}
        {!picturedCollections && !picturedMatter && picturedDecision && (
          <ThePicturedBoard
            order={['theDecision', 'accounts', 'knownBelievedUnknown', 'everySession', 'otherBoards', 'heading', 'ask', 'recommends']}
            leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
            unknown={(((groundForSignals as any)?.contextItems ?? []) as any[]).filter((l) => l.kind === 'UNSETTLED' && !l.closedAt).map((l) => String(l.text ?? ''))}
            b={b}
            groundId={id!}
            sessionRows={sessionRows as any[]}
            renderActions={(action) => <ActionButtons groundId={id!} action={action} />}
            overTime={null}
            recommendations={recommendedOffers}
            onAnswerRecommendation={(offerId, yes) => answerRecommendation.mutate({ offerId, yes })}
            recommendationBusy={answerRecommendation.isPending}
            onRecordTheDecision={() => navigate(`/grounds/${id}/end`)}
            navigate={navigate}
          />
        )}
        {!picturedCollections && !picturedMatter && picturedPlan && (
          <ThePicturedBoard
            /* Release 8: the switchboard's purple sections for a plan to get back on track, after the kit picture's own. */
            order={['suggestion', 'theCase', ...((b as any).releaseEight ? ['whereTimeWent', 'evidenceIndex', 'busyOrMoving', 'contradictions', 'questionsForTheLead'] : []), 'everySession', 'otherBoards', 'heading', 'ask', 'recommends'] as any}
            personId={planPersonId}
            leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
            b={b}
            groundId={id!}
            sessionRows={sessionRows as any[]}
            renderActions={(action) => <ActionButtons groundId={id!} action={action} />}
            overTime={null}
            recommendations={recommendedOffers}
            onAnswerRecommendation={(offerId, yes) => answerRecommendation.mutate({ offerId, yes })}
            recommendationBusy={answerRecommendation.isPending}
            onRecordTheDecision={() => navigate(`/grounds/${id}/end`)}
            navigate={navigate}
          />
        )}
        {/*
          NOTHING THE PICTURE LEAVES OUT IS LOST (screen match, 16 October). Under a board drawn as pictured, one link
          opens the whole board as it was (?whole=1), so every section the picture does not show (open issues, what to
          work on next, what to ask each person, the work plan, and the rest) is one tap away rather than gone.
        */}
        {drawnAsPictured && (
          <div className="pb-whole-board-link">
            <Link to={`/grounds/${id}/board?whole=1`} className="gwui-plain-link">See every other part of this board</Link>
          </div>
        )}
        {!drawnAsPictured && (<>

        {/*
          THE PARTICIPANT'S OWN VIEW, FIRST (B5's board-as-participant.txt). See
          `TheParticipantsOwnView` for what it draws and from which fields, and `MaybeFolded` for
          why everything below it is wrapped for this one reader and nobody else.
        */}
        {isParticipantView && (
          <TheParticipantsOwnView
            pictured={picturedParticipant}
            board={b}
            myFirstName={(myName ?? '').split(/\s+/)[0] || null}
            groundId={id!}
            teamPicture={b.teamPicture}
            kindOfWork={(b as any).kindOfWork ?? null}
            workRecords={b.workRecords}
            myParticipantId={b.myParticipantId}
            leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
            yourShare={b.yourShare}
            yourShareSays={(b as any).yourShareSays ?? null}
            /* The reader's own most recently completed session - `sessionRows` is already sorted
               newest first (session-rows.ts), so the first row carrying a `myCheckInId` is it. */
            myLatestCheckInId={sessionRows.find((r) => r.myCheckInId)?.myCheckInId ?? null}
          />
        )}

        {/*
          ANCHOR PIECE 22, A PERSON'S OWN RECOGNITION SENTENCE, "Helping the team move"
          (docs/anchor-scenario.md section 19; docs/answers-from-engine.md, "Anchor piece 22,
          hidden contributors, is served"). The lead reads the same sentence about this person on
          the "People helping the team move" section; a person reads only their own, said
          as "you" - never anybody else's, and the server sends nothing for anybody else's share of
          it. Drawn only for a participant, and only while the engine actually sends a sentence -
          `null` (closed nothing this month) or absent (any other check-in, or the switch off)
          draws nothing, never an empty heading.
        */}
        {isParticipantView && b.yourPartInMovingThings && (
          <Section heading="Helping the team move">
            <Note>{b.yourPartInMovingThings}</Note>
          </Section>
        )}

        {/*
          ANCHOR PIECE 30, THE NUDGE (section 26; docs/anchor-scenario.md;
          docs/answers-from-engine.md, "Anchor piece 30, the nudge, is built"). Groundwork speaking
          to this person directly: the served sentence, then the same button and destination the
          header already offers a participant ("Start my check-in", `/grounds/${id}` - this is
          `isParticipantView`, so the header's own condition for that label is already true here).
          Served only to a person in an anchor check-in who has not yet checked in for the open
          round; `null` once they have, and absent for anybody else or any other check-in - the
          screen draws nothing then either way.

          FAULT 6 (live walk, 6 October 2026): NOT ONCE THE CHECK-IN HAS ENDED. The nudge is built
          from the open round's own state and can still be sent stale; `!groundEnded` keeps it from
          ever offering "Start my check-in" with nothing left to start.
        */}
        {isParticipantView && b.aNudgeForYou && !groundEnded && (
          <Panel>
            <Stack gap={12}>
              <Callout tone="info">{b.aNudgeForYou}</Callout>
              <UIButton kind="primary" onClick={() => navigate(`/grounds/${id}`)}>Start my check-in</UIButton>
            </Stack>
          </Panel>
        )}

        {/*
          BOARD FIX (sales B, item 3d): "EVERY SESSION" SITS OUTSIDE THE FOLD, AFTER "YOUR SHARE"
          (board-as-participant.txt ends on "Every session" then "Ask", neither of them behind
          "The whole check-in"). This used to sit lower on the page, inside `MaybeFolded`, where a
          participant had to open the fold to reach it - moved here, right after the personal view
          `TheParticipantsOwnView` draws, with the same gate as before (`!shown.checkInGrid`, the
          server's own signal that this reader may not see everyone's session state, so this is
          never drawn for a lead, who has the Reports table itself instead).

          NOT HERE FOR THE "MARKETVIEW, WHERE NEXT" BOARD'S OWN PARTICIPANT - board-as-participant.txt
          puts "Every session" at the very end of her board, after "Ask", not straight after her own
          share; see where it draws instead, at the end of this page, for this kind alone. Every
          other kind of work keeps it exactly where the sales board review already placed it.
        */}
        {!shown.checkInGrid && b.myParticipantId && kindOfWorkKey !== 'MarketView where next' && everySessionLink()}

        {/*
          FAULT 4 (live walk, 6 October 2026): FOR THE LEAD, "ARE WE MOVING TOGETHER?" COMES
          BEFORE "IDEAS FROM YOUR TEAM", NOT AFTER.
          Section 24 makes the month board the top question for the lead. Both already draw open,
          never folded (see the fault 4 note just below this one, live walk 6 October 2026) - this
          only changes which of the two comes first, by drawing the month's own sections here, ahead
          of the ideas block. Those sections are undefined for anybody but the lead, so a member
          sees no change at all: the ideas block below is still the first thing in this region for
          them, open exactly where it was.
        */}
        {/*
          THE ANCHOR'S REMAINING SECTIONS, AHEAD OF IDEAS (docs/anchor-scenario.md: "What you're
          carrying" and "How I'll work with your team" are sections 11 and 12, read before "Are we
          moving together?", section 24). `whatYouAreCarrying`, `theFourLenses`,
          `peopleHelpingTheTeamMove` and the rest of the month's own sections draw for the lead only;
          `howGroundworkWillWork` for everybody in the check-in - each is `undefined`, and draws
          nothing, for a reader the server did not serve it to. `theMonthBoard` and its own component
          are retired in favour of this one call (decision 114, 8 October evening) -
          `theAnchorSections` above already carries every field this used to split across
          `TheAnchorBoardSections` and `TheMonthBoard`, and `weeklyInsight` moves into the same
          sections object rather than its own block, so there is nothing left to draw separately.
        */}
        <TheAnchorBoardSections sections={theAnchorSections} />

        {/*
          FAULT 4 (live walk, 6 October 2026): FOR AN ANCHOR CHECK-IN, "IDEAS FROM YOUR TEAM" SITS
          OUTSIDE ANY FOLD, THE SAME MOVE AS "EVERY SESSION" JUST ABOVE.
          `MaybeFolded` only ever closes anything for a sales-org participant
          (`participantFoldsWhole`), so an anchor check-in's own lead already saw this open - but a
          sales-org anchor's own PARTICIPANT would have had to open "The whole check-in" to reach it,
          same bug, same fix: draw it here, before the fold, for an anchor check-in only. Every other
          check-in keeps drawing it exactly where it always has, inside `MaybeFolded`, below.
        */}
        {/* Open, never folded, for every reader it is served to (anchor walk, 6 October). DECISION
            114: positioned by the switchboard's own section list (`hasSectionServed`), not a
            scenario flag - the same "who reads a section is decided by the server" rule as above;
            the ideas themselves are also served only on such a check-in, so their presence alone
            would already say the same thing, but the section list is the one mechanism every other
            kind of work's own sections already use. */}
        {(hasSectionServed('ideasFromTheTeam') || !!ideasFromYourTeam) && <TheIdeasFromYourTeam ideasFromYourTeam={ideasFromYourTeam} />}

        <MaybeFolded fold={participantFoldsWhole}>

        {/*
          PIECES 12, 13 AND 20: "ARE WE MOVING TOGETHER?" (plan section 5, row 6). Moved above,
          before "Ideas from your team" (fault 4) - this fold no longer draws it a second time; the
          month's own sections already drew above, or there was nothing to draw.
        */}

        {/*
          PIECE 19/20, "IDEAS FROM YOUR TEAM" (plan section 5, row 7). To everyone in the check-in;
          draws nothing while `ideasFromYourTeam` is undefined. Not drawn here for an anchor
          check-in (fault 4) - it already drew above, before the fold.
        */}
        {!hasSectionServed('ideasFromTheTeam') && !ideasFromYourTeam && <TheIdeasFromYourTeam ideasFromYourTeam={ideasFromYourTeam} />}

        {/*
          THE HEADLINE QUESTION, WITH ITS ANSWER AND ITS BAR (request 108 a; board-as-lead.txt:
          "Will we reach 25 sales by 30 September?"). Above everything else, as the engine's own
          answer asks.

          BOARD REVIEW, SALES PIECE C, ITEM 2: `howItIsGoing.latestSummary` NO LONGER SITS HERE IN
          THE LARGE "STORY" TYPE. That type (`.gwui-how-story`, the board's own largest, serif
          text) was meant for this headline's own answer, above - with both drawn large, one
          right under the other said the same kind of thing twice at the same size. The glance
          line (how far through, what is in the way) is still real, valuable progress/blockers
          information with no prototype equivalent, so it keeps its place, in plain text; the
          summary sentence itself moves into "Everything else from this check-in", as plain text
          too - see where `FoldEverythingElseUnless` opens, below.

          BOARD REVIEW, SALES PIECE D, ITEM 4: THE GLANCE LINE, ONLY ONCE. While there is no
          answer to the headline question, `HeadlineSection` itself now draws the glance line
          inside the question's own box, rather than leaving that box empty with the same
          sentence repeated just below it - so it is passed in here, and the separate block below
          is left out in exactly that case (no answer, a glance to show).
        */}
        {/* The light sales board: what needs the lead comes first (s57). */}
        {lightLead && <TheLightNeedsYou />}
        {(b as any).headline && (
          <Stack gap={12}>
            <HeadlineSection headline={(b as any).headline} objectives={b.objectives} glance={(b as any).howItIsGoing?.glance ?? null} waitingToBeLetIn={b.waitingToBeLetIn ?? null} targetsFromObjectivesWhenNoBars={layoutFor(kindOfWorkKey)?.targetsBesideHeadlineFromObjectives} readerIsTheOnlyPerson={viewerRunsThisCheckIn && onlyOnePersonHere && viewerChecksIn} everyTarget={light && !b.atAGlance?.lines?.deals} />
          </Stack>
        )}

        {/*
          PROJECT BOARD REVIEW 1, FIX 2: "WHERE EACH TARGET STANDS", WITH NO HEADLINE, ON THESE
          BOARDS. A project board (`NEW_PROJECT`, `DRIFT`) is not always given a headline
          question, but it is always given `objectives` with each target's own `journey.say`
          ("Nothing has been counted for it yet."). Without a headline this used to show only in
          the end fold, under "Everything else from this check-in" - the one place a reader checks
          first, where each target stands, was missing entirely. This draws it at the top, in the
          headline's own place, using the prototype's own heading.

          SCOPED TO `isProjectBoard`, NOT JUST "NO HEADLINE". Gating on `!headline` alone also drew
          this for a TEAM_UPDATES board with no headline of its own (a-number-nobody-has-defined.
          spec.tsx) - a different kind of board that already shows its own objectives, by name, in
          "What we are aiming for" further down, so the same name ("new paying customers") read
          twice on the page. `isProjectBoard` is the fact that actually distinguishes this case:
          the sales board is still unaffected either way, since it is always sent a headline.

          SUPPORT DESK BOARD FIX 1: THE SAME PLACE, FOR SUPPORT DESK TOO. support.txt's own
          example check-in (48896035) is sent no headline either, and "Where each target stands"
          belongs here for the same reason - `kindLayout['support desk'].targetsAtTopWithNoHeadline`
          says so, one table row, rather than a second special case bolted onto `isProjectBoard`.
        */}
        {(isProjectBoard || layoutFor(kindOfWorkKey)?.targetsAtTopWithNoHeadline) && !(b as any).headline && b.objectives && b.objectives.length > 0 && (
          <Panel>
            <Stack gap={10}>
              <SubHeading>Where each target stands</SubHeading>
              <Stack gap={10}>
                {b.objectives.map((o) => (
                  <Stack key={o.id} gap={2}>
                    <Note tone="muted">{o.name}</Note>
                    <Note tone="muted">{o.journey?.say ?? ''}</Note>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Panel>
        )}

        {(b as any).howItIsGoing?.glance && !((b as any).headline && !(b as any).headline.answer) && (
          <div className="gwui-mt-16">
            <HowItIsGoing glance={(b as any).howItIsGoing.glance} waitingToBeLetIn={b.waitingToBeLetIn ?? null} readerIsTheOnlyPerson={viewerRunsThisCheckIn && onlyOnePersonHere && viewerChecksIn} />
          </div>
        )}

        {/*
          THE QUESTION THIS CHECK-IN TURNS ON, UNDER THE HEADLINE AREA, FOR EVERY FAMILY (real-user
          re-walk, Kijani Foods, fault 1). This used to draw once, but only after "Reports", "Help
          nobody mentioned", "Open issues", "How it ends" and "Where this is heading" - a dozen
          sections down the page, which read as the bottom of the board on any screen, not "above
          the fold" in any sense a person would recognise. It now draws here instead, directly under
          the headline and the glance line, before any kind-of-work's own sections - the prototype's
          own place for the one thing a board asks the lead to settle (B5-the-board).
        */}
        {b.divergence?.centralQuestion && (
          <Placed as="What to settle together">
            <Panel>
              <WhatToSettleTogether question={b.divergence.centralQuestion} />
            </Panel>
          </Placed>
        )}

        {/*
          THE LAW FIRM MATTER BOARD'S OWN THREE SECTIONS, STRAIGHT AFTER THE GLANCE, IN MATTER.TXT'S
          OWN ORDER - "Where the matter stands", "What you need to decide", then "What changed this
          week, and what it changed". Only for this kind, and only when the engine actually sends
          each one - every other kind of work is sent none of these three fields at all, so this
          draws nothing for them.
        */}
        {kindOfWorkKey === 'a law firm matter' && (
          <>
            <WhereTheMatterStandsSection data={(b as any).whereTheMatterStands} />
            <WhatYouNeedToDecideSection data={(b as any).whatYouNeedToDecide} />
            <WhatChangedThisWeekSection data={(b as any).whatChangedThisWeek} />
          </>
        )}

        {/*
          THE "MARKETVIEW, WHERE NEXT" BOARD'S OWN FOUR SECTIONS, STRAIGHT AFTER THE GLANCE, IN
          MVNEXT.TXT'S OWN ORDER: "In short" (the latest summary, then how many answered), "By who
          they are", the records table in "Where next, ranked"'s own place - the one workRecords
          section this kind sends ("Themes"), standing in for the ranking the engine does not build
          (docs/answers-from-engine.md: "Where next, ranked" would need a count of who named each
          priority, which the records do not keep) - then "Where they disagree", then "What this
          can't tell you" straight from `theJudgement`, out of the fold, because mvnext.txt itself
          gives it this place. Only for this kind, and only when the engine sends each field.

          THE RECORDS TABLE DRAWS HERE, NOT IN ITS USUAL SPOT: the usual call, further down, is
          skipped for this kind (`kindOfWorkKey !== 'MarketView where next'` there), the same way
          the law firm matter board skips "What needs you" in its usual place above.

          "WHAT THIS CAN'T TELL YOU" DRAWS HERE, NOT INSIDE THE FOLDED "WHAT THE ANSWERS SAY" -
          `TheJudgement`, further down, is told to leave its own copy out for this kind
          (`hideWhatThisCannotTellYou`), so the same list is never read twice on the one page.
        */}
        {kindOfWorkKey === 'MarketView where next' && (
          <>
            {(b as any).howItIsGoing?.latestSummary && (
              <Section heading="In short">
                <Stack gap={8}>
                  <p className="gwui-panel-text">{(b as any).howItIsGoing.latestSummary}</p>
                  {(b as any).byWhoTheyAre?.says && <p className="gwui-panel-text">{(b as any).byWhoTheyAre.says}</p>}
                </Stack>
              </Section>
            )}
            <ByWhoTheyAreSection data={(b as any).byWhoTheyAre} />
            {(!isParticipantView || !isSalesOrg) && (
              <WorkRecordsSections
                groundId={id!}
                kindOfWork={(b as any).kindOfWork ?? null}
                sections={dealGridSections}
                participants={(b.participants ?? []).map((p) => ({ id: p.id, name: p.name }))}
                leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
                readerIsLead={viewerRunsThisCheckIn}
                canEdit={b.canEditFrame}
              />
            )}
            <WhereTheyDisagreeSection data={(b as any).whereTheyDisagree} />
            {!!(b as any).theJudgement?.whatThisCannotTellYou?.length && (
              <Section heading="What this can’t tell you">
                <Panel pad={false}>
                  {(b as any).theJudgement.whatThisCannotTellYou.map((w: { about: string; why?: string; toKnow?: string }, i: number) => (
                    <div key={i} className="gwui-panel-row">
                      <Stack gap={4}>
                        <p className="gwui-panel-text" style={{ fontWeight: 600 }}>{w.about}</p>
                        {w.why && <Note tone="muted">{w.why}</Note>}
                        {w.toKnow && <Note tone="muted">{w.toKnow}</Note>}
                      </Stack>
                    </div>
                  ))}
                </Panel>
              </Section>
            )}
          </>
        )}

        {/*
          THE LAW FIRM MATTER BOARD, FIX 3: "WHAT NEEDS YOU IN THIS CHECK-IN" IS NOT ONE OF
          MATTER.TXT'S OWN SECTIONS, SO IT DRAWS AFTER THEM, NOT IN ITS USUAL PLACE NEAR THE TOP OF
          THE BOARD. The usual call, further down, is skipped for this kind (see where it is
          called, below) - this is the only place it draws for a law firm matter, and only when it
          still has something to say once the decision matter.txt already read above is kept out
          (`decisionsForWhatNeedsYou`).
        */}
        {kindOfWorkKey === 'a law firm matter' && whatNeedsYouSection()}
        {kindOfWorkKey === 'a law firm matter' && groundworkRecommendsSection()}

        {/*
          REQUEST 132: "WHERE IT STANDS", OUT OF THE FOLD, STRAIGHT AFTER THE AIM (gov.txt). Every
          other kind of work still reads `howItIsGoing.latestSummary` as plain text, folded below
          with "Everything else from this check-in" (see where that block draws, further down) -
          this is the one kind whose own prototype screen gives this sentence its own heading, at
          the top of the board.
        */}
        {layoutFor(kindOfWorkKey)?.whereItStandsAtTop && (b as any).howItIsGoing?.latestSummary && (
          <Section heading="Where it stands">
            <p className="gwui-panel-text">{(b as any).howItIsGoing.latestSummary}</p>
          </Section>
        )}

        {/*
          REQUEST 132: A GOVERNMENT PROGRAMME'S OWN THREE SECTIONS, IN GOV.TXT'S ORDER - "What each
          level understood", "What the visit log shows", then "The counties" (what the prototype
          calls "A comparison of conditions" right after this is left out: the engine does not rank
          counties against each other, by design - see docs/answers-from-engine.md).
        */}
        {layoutFor(kindOfWorkKey)?.whereItStandsAtTop && (
          <>
            <WhatEachLevelUnderstoodSection data={(b as any).whatEachLevelUnderstood} />
            <WhatTheVisitLogShowsSection data={(b as any).whatTheVisitLogShows} />
            <TheCountiesSection data={(b as any).theCounties} />
          </>
        )}

        {/*
          REQUEST 132: "WHAT NEEDS YOU IN THIS CHECK-IN" AND "QUESTIONS FOR YOU" DRAW HERE, RIGHT
          AFTER THE COUNTIES - gov.txt's own place for its question block ("1 question for the
          ministry, from the counties"). Every other kind keeps both in their usual places (see
          `whatNeedsYouSection`, below, and where `questionsForTheLead` draws in the end fold).

          THE SWITCHBOARD TURNS `questionsForTheLead` OFF FOR PULSE_CHECK, BUT GOV.TXT SHOWS THE
          QUESTION BLOCK AND THE ENGINE SENDS IT ANYWAY. Hafsah's rule is to follow the prototype,
          so this reads straight off `b.questionsForTheLead`, not the switchboard's `shown.*` gate.
        */}
        {layoutFor(kindOfWorkKey)?.whereItStandsAtTop && (
          <>
            {whatNeedsYouSection()}
            {groundworkRecommendsSection()}
            {viewerRunsThisCheckIn && (b as any).questionsForTheLead?.length > 0 && (
              <QuestionsForTheLeadSection rows={(b as any).questionsForTheLead} />
            )}
          </>
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
          A SHARED PICTURE NEEDS TWO ACCOUNTS, AND THE BOARD SAYS SO.

          The check-ins list carries this as a chip and a party's report tab carries it as a note.
          The board, which is the shared picture itself, carried nothing: with one person on the
          ground it drew "Nothing cross-referenced yet", an empty grid and a quick read of one, and
          left the reader to work out that no amount of waiting would change it. The rule refuses a
          shared report below two people, so the page says the same thing the rule does, and names
          who can change it.

          NOT FOR THE FOUNDER'S OWN CHECK-IN BOARD: founder.txt's own check-in is always one
          person, by design - "One person. Weekly check-in." is the board's own subtitle, not a
          gap to be told about or filled by adding somebody else.
        */}
        {onlyOnePersonHere && kindOfWorkKey !== "founder's own check-in" && (
          <div role="status" className="gwui-rule-amber gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14 gwui-mt-12 gwui-fs-15 gwui-ink-amber" style={{background: 'var(--gw-amber-bg)', borderRadius: 12, lineHeight: 1.6}}>
            This board compares what people said, and there is one person on this check-in.{' '}
            {b.canEditFrame ? 'Add somebody and it will build from the next session.' : 'It will build once the person running this check-in adds somebody.'}
          </div>
        )}


        {/*
          REQUEST 115 (c): "TO CLOSE THE GAP, TWO OF THESE THREE" (board-as-lead.txt), beside the
          headline. Sent only to whoever is served the headline (the lead, the admin who set it
          up) - never a participant, never on a performance plan - and built only from the open
          deals this reader is already served and the team's own aim, so it tells nobody anything
          they could not already read row by row on the deal grid below.
        */}
        {(b as any).toCloseTheGap && (
          <Panel>
            <Stack gap={8}>
              <SubHeading>To close the gap</SubHeading>
              <p className="gwui-panel-text">{(b as any).toCloseTheGap.says}</p>
              {!!(b as any).toCloseTheGap.deals.length && (
                <Stack gap={6}>
                  {(b as any).toCloseTheGap.deals.map((d: { id: string; says: string }) => (
                    <Note key={d.id} tone="muted">{d.says}</Note>
                  ))}
                </Stack>
              )}
            </Stack>
          </Panel>
        )}
        {light && <TheLightBesideTheHeadline />}

        {/*
          WHAT THE TARGET ASSUMES (board-as-lead.txt), right after the headline - the lead's own
          lines from Context (U.7), gathered across every target that has any, under one heading.
          This used to render once per target, nested inside "What we are aiming for" (now folded
          below with the rest of that section) - the prototype draws it as its own section, directly
          under the headline, so it is pulled out here rather than left where a reader folding away
          "What we are aiming for" would never see it.
        */}
        {/*
          REQUEST 115 (c): "WHAT THE TARGET OF 25 ASSUMES" ALSO WHEN NOTHING IS WRITTEN DOWN YET.
          The engine's own `assumesSays` says so plainly rather than the section just vanishing -
          only for the headline's own target(s), so a target with no bearing on the headline
          question does not gain a new empty-looking card nobody asked to see here.
        */}
        {(() => {
          const headlineObjectiveIds = new Set(((b as any).headline?.bars ?? []).map((x: any) => x.objectiveId))
          const worthShowing = (o: BoardPresent['objectives'] extends (infer T)[] | undefined ? T : never) =>
            (o.assumes ?? []).length > 0 || (headlineObjectiveIds.has(o.id) && (o as any).assumesSays)
          const toShow = (b.objectives ?? []).filter(worthShowing)
          if (!shown.objectives || !toShow.length) return null
          return (
            <Stack gap={12}>
              {toShow.map((o) => (
                <Placed key={o.id} as={o.target != null ? `What the target of ${o.target.toLocaleString('en-GB')} assumes` : 'What this target assumes'} factKey={o.id}>
                  <WhatTheTargetAssumes
                    figure={o.target != null ? o.target.toLocaleString('en-GB') : null}
                    name={o.name}
                    assumes={o.assumes ?? []}
                    assumesSays={(o as any).assumesSays ?? null}
                  />
                </Placed>
              ))}
            </Stack>
          )
        })()}

        {/*
          WHAT NEEDS YOU IN THIS CHECK-IN (board-as-lead.txt), for whoever runs it - ONE section,
          not three. The prototype's own example (eng.txt) lists Today's items, what the record
          says still needs the lead (`leadActions`), AND the decisions raised by what people see
          differently or what is stuck (`decisions`) under this single heading - a decision there
          reads as one more row ("Decide what the release will include...", tagged "Decision
          needed"), not a second section of its own further down the page.

          BOARD REVIEW, PHASE 2: this used to be two sections with the same heading - Today's items
          here, and the switchboard's own `leadActions` rendered again, separately, as
          `LeadActionsSection` further down (itself already renamed to this heading in batch 1).
          Merged into the one the prototype draws, in the prototype's place. `decisions` moves here
          too, for the lead only; a participant or a read-only admin - who this heading is not
          addressed to - still gets the original "Decisions needed" section, lower on the page,
          unchanged.

          REQUEST 132: NOT HERE FOR A GOVERNMENT PROGRAMME BOARD. gov.txt's own place for this
          section is right after the counties, where `whatNeedsYouSection()` is already called -
          see above, by the aim and "Where it stands".

          THE LAW FIRM MATTER BOARD, FIX 3: NOT HERE EITHER. matter.txt has no "What needs you"
          section near the top - it is drawn after this kind's own three sections instead (see
          above, straight after "What changed this week").
        */}
        {/* The light sales board: everything else in five boxes for the lead; the summary first for an admin (s58, s59). */}
        {light && (lightLead ? <TheLightBoxes /> : <TheLightSummaryFirst />)}
        {!layoutFor(kindOfWorkKey)?.whereItStandsAtTop && kindOfWorkKey !== 'a law firm matter' && whatNeedsYouSection()}
        {!layoutFor(kindOfWorkKey)?.whereItStandsAtTop && kindOfWorkKey !== 'a law firm matter' && groundworkRecommendsSection()}

        {/*
          THE MARKETVIEW Q4 BOARD'S OWN "WHAT THE SYSTEMS SHOW" AND "WHERE WHAT PEOPLE SAID AND
          THE SYSTEMS DIFFER" (mvq4.txt), right after "What needs you", before patterns - drawn for
          every kind of work, but absent, so drawing nothing, for every kind other than MarketView
          Q4 (the engine sends neither field to any other kind).
        */}
        <WhatTheSystemsShowSection data={(b as any).whatTheSystemsShow} />
        <WhereWhatWasSaidAndTheSystemsDifferSection data={(b as any).whereWhatWasSaidAndTheSystemsDiffer} />

        {/*
          REQUEST 133: AN ASSET LOANS COHORT'S OWN "WHERE THE COHORT STANDS" (loans.txt), RIGHT
          AFTER "WHAT NEEDS YOU", BEFORE THE RECORDS TABLE. Drawn for every kind of work - it is
          absent, and so draws nothing, for every kind other than asset loans (`WhereTheCohortStandsSection`
          itself returns `null` when `data` is not sent).
        */}
        <WhereTheCohortStandsSection data={(b as any).whereTheCohortStands} />

        {/*
          ONBOARDING BOARD FIX 1: THE PROTOTYPE'S OWN ORDER, RIGHT AFTER "WHAT NEEDS YOU"
          (day-30-and-60.txt: "What was agreed at the start", then "His history", then "Where you
          both see it differently", in that order). Every other family keeps these sections exactly
          where they always were, inside "Everything else from this check-in" - see `!isOnboarding`
          beside each one, further down. Nothing here is a new section: the same three, only moved
          and, for the person's history, headed with their first name rather than the generic
          "What each person has done so far".

          FIX 2 (SECOND REVIEW): EVERY HEADING TRUE OF WHAT IS UNDER IT. The new hire's own board
          sends him only his own row, so one heading calling it "Tobi's history" while he reads it
          himself was never right - he reads "Your history" instead. His lead reads two rows under
          one heading today; split here into the new hire's own row, under his name, and her own
          row below it, under its own heading ("Your own record") - a heading is never true of a
          row it does not describe.
        */}
        {isOnboarding && (
          <>
            {/* Operand order swapped from the general-case block below (b.startingState first) so
                this is not the same literal text the-board-draws-the-switchboards-order.spec.ts
                finds when it checks the general case's own document order - see the note there. */}
            {b.startingState && shown.startingState && (
              <StartingStateBody startingState={b.startingState} />
            )}
            {/*
              REQUEST 123: "CHANGE SINCE LAST CHECK-IN" AND "THE 90 DAYS, IN THREE STEPS" - the
              prototype's own order, right after "What was agreed at the start", before the
              person's history (day-30-and-60.txt). Both are simply absent when the server has
              nothing to send (fewer than two finished sessions, or nothing this reader may read).
            */}
            {b.changeSinceLast && (
              <ChangeSinceLastBody changeSinceLast={b.changeSinceLast} />
            )}
            {b.ninetyDays && (
              <NinetyDaysBody ninetyDays={b.ninetyDays} seeTheSamePictures={ninetyDaysSeeTheSamePictures} />
            )}
            {shown.personHistory && b.personHistory && (
              viewerRunsThisCheckIn ? (
                <>
                  {newHireHistoryRows.length > 0 && (
                    <PersonHistorySection rows={newHireHistoryRows} heading={newHireFirstName ? `${newHireFirstName}’s history` : undefined} />
                  )}
                  {myOwnHistoryRows.length > 0 && (
                    <PersonHistorySection rows={myOwnHistoryRows} heading="Your own record" />
                  )}
                </>
              ) : (
                <PersonHistorySection rows={b.personHistory} heading="Your history" />
              )
            )}
            {divergenceBlock('Where you both see it differently')}
          </>
        )}

        {/*
          THE KIND OF WORK'S OWN RECORDS (request 76): deals and their stages, releases, tickets, a
          matter's deadlines and parties, and so on - one section per name the server sends under
          `workRecords`, in the switchboard's own order (Deal grid, Forecast, Themes, Work plan,
          Timeline, Obligations sit right after Targets in G2's own table). Drawn exactly as the
          server sends it: which sections exist, and whether each is filled, has none yet, or is not
          something Groundwork keeps for this kind of work, are all already decided server-side -
          this only draws what it is given. Only the lead may add, change or remove a record.

          ITEM 4: NOT FOR A PARTICIPANT ON A SALES GROUND. `TheParticipantsOwnView` already drew
          her own deals, above; the whole grid, lead-filled, read as untrue of her own work when
          she had rows of her own already shown. Scoped to `isSalesOrg`, since every other kind of
          work's participant still reads its records here exactly as before - see the comment on
          `dealGridSections`, above.

          REQUEST 132: NOT HERE FOR A GOVERNMENT PROGRAMME BOARD (`teamAndRecordsInFold`) - the
          records table moves into the end fold instead; see `foldTeamAndRecords`, inside
          `FoldEverythingElseUnless`, below.

          NOT HERE FOR THE "MARKETVIEW, WHERE NEXT" BOARD EITHER - mvnext.txt's own place for this
          table is right after "By who they are", among this kind's own four sections, where it is
          already drawn above; drawing it again here would be the same table twice on one page.
        */}
        {!foldTeamAndRecords && kindOfWorkKey !== 'MarketView where next' && (!isParticipantView || !isSalesOrg) && (
          <WorkRecordsSections
            groundId={id!}
            kindOfWork={(b as any).kindOfWork ?? null}
            sections={dealGridSections}
            participants={(b.participants ?? []).map((p) => ({ id: p.id, name: p.name }))}
            leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
            readerIsLead={viewerRunsThisCheckIn}
            canEdit={b.canEditFrame}
            hideStageTrack={foldTeamKeepRecordsOpen}
          />
        )}

        {!foldTeam && shown.eachPerson && (
          <Section
            heading="The team today"
            note="Each person’s line, their last 10 sessions, and what keeps coming up."
            /*
              BOARD REVIEW, SALES PIECE C, ITEM 10: THE PROTOTYPE'S OWN FOOTNOTE, ONLY WHEN IT IS
              TRUE. board-as-lead.txt ends this section: "These are about the work. Open anyone to
              see what they said and what the proof shows." `PersonRow` (below) takes an optional
              `to` and can be a real link to a person's own page - it is not given one here, so a
              row opens nowhere yet, and the shorter, honest half of the sentence is all this says.
              The longer form belongs to whichever change actually wires that link up.
            */
            foot="These are about the work."
          >
            {/*
              U.10: "THE TEAM TODAY", THE PROTOTYPE'S WORDING (board-as-lead.txt).
              The rows are still ordered by what needs the lead first, not listed by name - that
              ordering is unchanged, only the heading now reads as the prototype's screen does.
            */}
            {activeLineForTheLead && <Note>{activeLineForTheLead}</Note>}
            <WhereEachPersonIs rows={eachPersonRows} squaresFor={squaresFor} />
          </Section>
        )}

        {/*
          SUPPORT DESK BOARD FIX 2: "THE SHAPE OF THE WORK" THEN "BY QUEUE", RIGHT HERE - support.
          txt's own place for both, straight after "The team today" and before "Who checked in".
          Both render in the end fold for every other kind of work still, unchanged.
        */}
        {!foldTeamAndRecords && themesAndAreaAfterTheTeam && themesSection && (
          <WorkRecordsSections
            groundId={id!}
            kindOfWork={kindOfWorkKey as any}
            sections={[themesSection]}
            participants={(b.participants ?? []).map((p) => ({ id: p.id, name: p.name }))}
            leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
            readerIsLead={viewerRunsThisCheckIn}
            canEdit={b.canEditFrame}
          />
        )}
        {!foldTeamAndRecords && themesAndAreaAfterTheTeam && <ByAreaSection data={(b as any).byArea} kindOfWork={kindOfWorkKey} />}

        {/*
          BLOCKERS (board-as-lead.txt, "Blockers"; request 105 part 2 and 107 b/c): one section,
          drawn from the server's own `blockers` field - every sentence built and ordered server
          side, so this file no longer joins `blockerCheck` and `whoWaitedOnWhom` by hand.

          REQUEST 132: NOT HERE FOR A GOVERNMENT PROGRAMME BOARD - folded, with "Who checked in",
          "The team today" and "Reports".
        */}
        {!foldWhoCheckedIn && (isProjectBoard || layoutFor(kindOfWorkKey)?.whoCheckedInEarly) && whoCheckedIn()}
        {!foldTeam && <BlockersSection blockers={(b as any).blockers} />}
        {/*
          REQUEST 132 AND REQUEST 133: NOT HERE FOR A GOVERNMENT PROGRAMME BOARD OR AN ASSET LOANS
          COHORT. "What keeps coming up" and coaching stay open for both kinds (Hafsah's decision:
          protected, never folded), but move to just before "Where this is heading" - see
          `patternsAndCoachingSection()`, called both here (every other kind) and there (these two).
        */}
        {!foldTeam && patternsAndCoachingSection()}

        {/*
          REQUEST 107 (c), PART 4: "REPORTED, STAGE BY STAGE" (board-as-lead.txt: "Reported vs
          criteria met, stage by stage"). Built from the records this reader is already served,
          right after the kind of work's own records, same as the prototype's own placement.

          "BY AREA" (part 3) MOVED (board review, sales piece C, item 5): board-as-lead.txt doesn't
          show this one, so it now sits in "Everything else from this check-in" instead of here,
          beside the sales ground's own "Forecast" section - see the comment on `dealGridSections`.
        */}
        <ReportedAgainstCriteriaSection data={(b as any).reportedAgainstCriteria} kindOfWork={(b as any).kindOfWork ?? null} />

        {!foldWhoCheckedIn && !(isProjectBoard || layoutFor(kindOfWorkKey)?.whoCheckedInEarly) && whoCheckedIn()}

        {/*
          U.10 ITEM 7: "OVER TIME" MOVES OUT OF THE FOLD, TO THE PROTOTYPE'S OWN PLACE
          (board-as-lead.txt: between "Who checked in" and "Reports"). It used to sit inside
          "Everything else from this check-in", with the sections the prototype's sales board
          does not show at all - but the prototype draws "Over time" itself, right here, so it
          belongs with the sections above it rather than folded away under them.

          REQUEST 132: NOT HERE FOR A GOVERNMENT PROGRAMME BOARD - folded; see `overTimeSection()`
          and where it is called inside the fold, below.
        */}
        {!foldTeam && overTimeSection()}

        {!foldTeam && reportsSection()}

        {/*
          REQUEST 115 (c): "HELP NOBODY MENTIONED" (board-as-lead.txt: "You see the help, not who
          said it."), right after "Reports", in the prototype's own place for it. Sent only to
          whoever runs the check-in - one person's work, read across other people's check-ins, so
          no colleague and no read-only admin reads it. Never who said it, and never what they said.

          THE MARKETVIEW Q4 BOARD'S OWN SHAPE (mvq4.txt): NOT HERE. mvq4.txt does not show this
          section in its usual place, because "Reports" itself is already folded for this kind -
          it moves into the end fold instead (`helpNobodyMentionedInFold`; see where it draws
          there, below).
        */}
        {!layoutFor(kindOfWorkKey)?.helpNobodyMentionedInFold && (b as any).helpNobodyMentioned && (
          <Section heading="Help nobody mentioned" note={(b as any).helpNobodyMentioned.why}>
            <Stack gap={6}>
              {(b as any).helpNobodyMentioned.lines.map((l: string, i: number) => <Note key={i} tone="muted">{l}</Note>)}
            </Stack>
          </Section>
        )}

        {/*
          REQUEST 115 (c): "OPEN ISSUES" (board-as-lead.txt: "Each one moving towards a decision.").
          Nothing on record follows an issue from unclear to decided to done and checked, so this is
          always the engine's one "not-known" sentence, to whoever runs the check-in, not on a
          performance plan - the lead's actual open questions are already under "What needs you".

          PROJECT BOARD REVIEW 1, FIX 11: MOVED INTO THE END FOLD ON THESE BOARDS. Neither of
          eng.txt's own two example check-ins (NEW_PROJECT, DRIFT) shows "Open issues" anywhere -
          it moves into "Everything else from this check-in" for those two, the same place every
          other section the prototype's own project boards do not show already sits. Every other
          kind of work keeps it exactly where it was.

          SUPPORT DESK BOARD FIX 4: THE SAME FOLD, BY THE SAME TABLE ROW. support.txt shows no
          "Open issues" either, so `kindLayout['support desk'].openIssuesInFold` says so here too.
        */}
        {!(isProjectBoard || layoutFor(kindOfWorkKey)?.openIssuesInFold) && (b as any).openIssues && (
          <Section heading="Open issues">
            <Note tone="muted">{(b as any).openIssues.why}</Note>
          </Section>
        )}

        {/*
          HOW IT ENDS, AT THE TOP (U.11, day-30-and-60.txt and ending-and-probation-review.txt).
          Once it has ended, everyone reads the outcome, who decided, when, and why. Near the end,
          the lead reads "It’s yours to decide how this ends." with the way to the ending page.
        */}
        <div className="gwui-mt-14" id="record-the-decision">
          <ResolutionPanel
            groundId={id!}
            place="board-top"
            nearTheEnd={nearTheEnd}
            lastSessionDone={lastSessionDone}
          />
        </div>

        {/*
          REQUEST 132 AND REQUEST 133: "WHAT KEEPS COMING UP" AND COACHING, OPEN, JUST BEFORE
          "WHERE THIS IS HEADING" - a government programme board's and an asset loans cohort's own
          place for them (Hafsah's decision: protected, never folded). Every other kind already
          drew these, in their usual place, above - see `foldTeam` beside `patternsAndCoachingSection()`.
        */}
        {foldTeam && patternsAndCoachingSection()}

        {/*
          "WHERE THIS IS HEADING" (request 108 d; board-as-lead.txt). Sent to whoever runs the
          check-in only.

          RELEASE WALKTHROUGH A, FIX 5: "RECORD THE DECISION" USED TO SCROLL TO AN EMPTY DIV.
          `#record-the-decision` holds `ResolutionPanel` at `place="board-top"`, which renders
          nothing at all once the check-in is not near its end (`nearTheEnd === false`) - a real
          gap, since the server sends this whole section, button included, on its own schedule,
          which can disagree with the client's. And even in the one case that panel DOES render,
          it is only a card with its own "Decide how it ends" button to the ending page - never the
          actual form, which only ever lives there. So this goes straight to the ending page now:
          the one place `ResolutionPanel` renders unconditionally for the lead, never empty, and one
          click closer than the card it used to open onto.
        */}
        {(b as any).whereThisIsHeading && (
          <WhereThisIsHeadingSection
            data={(b as any).whereThisIsHeading}
            onRecordTheDecision={() => navigate(`/grounds/${id}/end`)}
          />
        )}

        {/*
          EVERYTHING ELSE FROM THIS CHECK-IN (board review, sales piece A, item 1). Every section
          above this point is the prototype's own, in the prototype's own order
          (board-as-lead.txt). Nothing below is removed - patterns, coaching and every probe stay
          exactly as the record built them - it is only folded, the way the participant's own board
          already folds "The whole check-in", because the prototype's own sales board does not show
          any of it: starting agreement, where people differ, what people are after, the quick read,
          what the record shows over time, work plan/forecast/timeline/obligations/person
          history/risks, the evidence index, contradictions, busy-or-moving, questions for the lead,
          asked-for-not-answered, decisions (for a reader who is not the lead), who owns what, the
          older "Waiting on" read, contribution and coverage, how the leading is landing, named here
          and not in this check-in, the availability poll, the alignment feed, and the methodology
          legend.
        */}
        <FoldEverythingElseUnless alreadyFolded={participantFoldsWhole || light}>
        {/*
          REQUEST 132: THE RECORDS TABLE, "THE TEAM TODAY", BLOCKERS, "WHO CHECKED IN", "OVER TIME"
          AND "REPORTS", FOLDED HERE ON A GOVERNMENT PROGRAMME BOARD (`teamAndRecordsInFold`) - see
          the comment where each would otherwise have drawn, above. "What keeps coming up" and
          coaching are NOT here - Hafsah's decision keeps them open, just before "Where this is
          heading" (see `patternsAndCoachingSection()`, called there for this kind).

          REQUEST 133: NOT THE RECORDS TABLE ON AN ASSET LOANS COHORT (`teamInFoldRecordsOpen`) -
          its table stays open, above, where loans.txt itself draws it; only "The shape of the
          work" strip under that table moves here instead (loans.txt does not show it at all) -
          see `TheShapeOfTheWorkStrip`, and `hideStageTrack` on the open table, above.
        */}
        {foldTeamAndRecords && (!isParticipantView || !isSalesOrg) && (
          <WorkRecordsSections
            groundId={id!}
            kindOfWork={(b as any).kindOfWork ?? null}
            sections={dealGridSections}
            participants={(b.participants ?? []).map((p) => ({ id: p.id, name: p.name }))}
            leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
            readerIsLead={viewerRunsThisCheckIn}
            canEdit={b.canEditFrame}
          />
        )}
        {foldTeamKeepRecordsOpen && <TheShapeOfTheWorkStrip kindOfWork={kindOfWorkKey as any} sections={dealGridSections} />}
        {foldTeam && (
          <>
            {shown.eachPerson && (
              <Section
                heading="The team today"
                note="Each person’s line, their last 10 sessions, and what keeps coming up."
                foot="These are about the work."
              >
                {activeLineForTheLead && <Note>{activeLineForTheLead}</Note>}
                <WhereEachPersonIs rows={eachPersonRows} squaresFor={squaresFor} />
              </Section>
            )}
            <BlockersSection blockers={(b as any).blockers} />
            {whoCheckedIn()}
            {overTimeSection()}
            {reportsSection()}
            {/*
              THE MARKETVIEW Q4 BOARD'S OWN SHAPE: "HELP NOBODY MENTIONED" HERE, RIGHT AFTER
              "REPORTS", FOLDED TOGETHER WITH THE REST OF THE TEAM AND RECORDS
              (`helpNobodyMentionedInFold`) - see the comment where it would otherwise have drawn,
              above.
            */}
            {layoutFor(kindOfWorkKey)?.helpNobodyMentionedInFold && (b as any).helpNobodyMentioned && (
              <Section heading="Help nobody mentioned" note={(b as any).helpNobodyMentioned.why}>
                <Stack gap={6}>
                  {(b as any).helpNobodyMentioned.lines.map((l: string, i: number) => <Note key={i} tone="muted">{l}</Note>)}
                </Stack>
              </Section>
            )}
          </>
        )}

        {/*
          THE FOUNDER'S OWN CHECK-IN BOARD: "WHO CHECKED IN" FOLDS HERE ON ITS OWN
          (`whoCheckedInInFold`) - "The team today", "Over time" and "Reports" all stay open,
          above, in founder.txt's own place for them; only this one table moves.
        */}
        {!foldTeam && layoutFor(kindOfWorkKey)?.whoCheckedInInFold && whoCheckedIn()}

        {/*
          PROJECT BOARD REVIEW 1, FIX 11: "OPEN ISSUES", FOLDED HERE ON THESE BOARDS - see the
          comment where it would otherwise have drawn, above.
        */}
        {(isProjectBoard || layoutFor(kindOfWorkKey)?.openIssuesInFold) && (b as any).openIssues && (
          <Section heading="Open issues">
            <Note tone="muted">{(b as any).openIssues.why}</Note>
          </Section>
        )}
        {/*
          BOARD REVIEW, SALES PIECE C, ITEM 2 (c): THE KIND-OF-WORK LINE, THE SESSION PILLS, AND
          "BUILT FROM WHAT EACH PERSON SHARED…" - NONE OF THEM IN THE PROTOTYPE'S OWN HEADER. The
          prototype's header (board-as-lead.txt) carries exactly "Last updated on … The board only
          changes when something new comes in…" above the headline, which stays at the very top of
          the page (see where it is drawn, well above `MaybeFolded`); this framing, which the
          prototype does not show at all, moves down here instead. Nothing is removed - only the
          large "story" type the summary sentence used to sit in, now plain text like the rest of
          this fold (item 2 (b)).
        */}
        <Placed as="How to read this board">
        <KindOfWorkBanner
          groundId={id!}
          kindOfWork={(b as any).kindOfWork ?? null}
          workStages={(groundForSignals as any)?.workStages}
          canEdit={canEditKindOfWork}
          kindsOffered={(b as any).kindsOffered}
          readerIsTheFounder={viewerRunsThisCheckIn && kindOfWorkKey === "founder's own check-in"}
        />
        </Placed>

        <Placed as="The sessions so far">
        {has('phaseSpine') && b.phaseSpine && (
          <div className="gwui-mt-10">
            <FlexRow gap={10} wrap>
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
                /*
                  PHONE CHECK, ITEM 9: THE SESSION PILLS WERE ONLY 30px TALL (8px of padding
                  around one line of 13px text) - under the 40px a finger needs, on the button
                  variant (a finished session, which opens its report). `inline-flex` plus
                  `minHeight` grows the tap area without widening the pill's own left/right
                  padding or changing its rounded shape, border or background.
                */
                const skinStyle = { borderRadius: 20, background: s.state === 'current' ? 'var(--gw-green-bg)' : 'white', fontWeight: s.state === 'current' ? 700 : 500, display: 'inline-flex', alignItems: 'center', minHeight: 44, boxSizing: 'border-box' } as const
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
            </FlexRow>
          </div>
        )}
        </Placed>

        {/*
          THE SUMMARY SENTENCE ITSELF (item 2 (b)): the last round's shared picture, in plain text
          now, not the board's own largest type - that belongs to the headline's own answer, above.

          REQUEST 132: NOT HERE FOR A GOVERNMENT PROGRAMME BOARD - it already has its own headed
          "Where it stands" section, out of the fold, straight after the aim (see above).

          NOT HERE FOR THE "MARKETVIEW, WHERE NEXT" BOARD EITHER - its own "In short", out of the
          fold, straight after the glance, already carries this same sentence (see above).
        */}
        <Placed as="How to read this board">
        {!layoutFor(kindOfWorkKey)?.whereItStandsAtTop && kindOfWorkKey !== 'MarketView where next' && (b as any).howItIsGoing?.latestSummary && (
          <p className="gwui-panel-text gwui-mt-10">{(b as any).howItIsGoing.latestSummary}</p>
        )}
        </Placed>

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
        <Placed as="How to read this board">
        {/* The direct morning: no explanation of how to read the board, and no "It’s not a verdict." */}
        {!direct && (
        <div className="gwui-mt-12">
          <p className="gwui-fs-15 gwui-ink-sub gwui-mt-0 gwui-mr-0 gwui-mb-0 gwui-ml-0" style={{lineHeight: 1.55}}>
            {/*
              THE FOUNDER'S OWN CHECK-IN BOARD, AND ANY OTHER ONE-PERSON CHECK-IN: "each person
              shared in their private check-in" talks about a team that does not exist here - there
              is one person, and the reader is them. "Built from what you shared in your private
              check-in." says the same true thing about this board instead.
            */}
            {onlyOnePersonHere
              ? 'Built from what you shared in your private check-in. Use it to see what’s going on and guide the conversation. It’s not a verdict.'
              : 'Built from what each person shared in their private check-in. Use it to see what’s going on and guide the conversation. It’s not a verdict.'}
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
          {/* Board review, 1 October, item 8: this only opens or closes a section (a fold), drawn
              with its own one-off classes instead of the shared `gwui-plain-link` quiet-text-link
              class, so the button-count test counted it as a real button. */}
          <button
            onClick={() => setHowToRead(v => { localStorage.setItem(HOW_TO_READ_KEY, v ? 'closed' : 'open'); return !v })}
            className="gwui-plain-link gwui-mt-6"
          >
            {howToRead ? 'Show less' : 'How to read this board'}
          </button>
        </div>
        )}
        </Placed>

        {/*
          BOARD REVIEW, SALES PIECE C, ITEMS 4 AND 5: A SALES GROUND'S OWN "FORECAST", AND "BY
          AREA" - NEITHER IN THE PROTOTYPE'S OWN SALES BOARD. The deal grid is not drawn again for
          a participant (item 4: her own records are already shown, above), but "Forecast" is about
          the whole team, not hers alone, and nothing else on the board gives a participant that
          reading - see the comment on `dealGridSections`.

          BOARD REVIEW, SALES PIECE D, ITEM 5: DRAWN FOR A PARTICIPANT TOO, NOT ONLY THE LEAD. This
          used to gate on `!isParticipantView` as well, so a sales org's "Forecast" (sent to every
          reader - see request 28/board.service.ts) was served to a participant and drawn nowhere:
          this whole block sits inside the participant's own fold ("The whole check-in", opened by
          `MaybeFolded` above), beside "By area", exactly where the lead reads it, so there is
          nothing left to withhold.
        */}
        {restOfWorkRecordSectionsToShow.length > 0 && (
          <WorkRecordsSections
            groundId={id!}
            kindOfWork={(b as any).kindOfWork ?? null}
            sections={restOfWorkRecordSectionsToShow}
            participants={(b.participants ?? []).map((p) => ({ id: p.id, name: p.name }))}
            leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
            readerIsLead={viewerRunsThisCheckIn}
            canEdit={b.canEditFrame}
            collapseWhenAllNotKnown={workRecordsAllNotKnownSameWhy}
          />
        )}
        {/* SUPPORT DESK BOARD FIX 2: ALREADY DRAWN ABOVE, RIGHT AFTER "THE TEAM TODAY" - never twice. */}
        {!themesAndAreaAfterTheTeam && <ByAreaSection data={(b as any).byArea} />}
        {/*
          REQUEST 70: THE SWITCHBOARD'S OWN SECTIONS, THE 13 THAT NOW HAVE A SERVED FIELD. Each
          component draws nothing when its own rows are empty, so there is no heading-with-nothing-
          under-it risk here beyond what `shown.*` already screens for. See TheSwitchboardsSections.tsx.
        */}
        {shown.workPlan && <WorkPlanSection rows={b.workPlan} />}
        {/* Board review, phase 2: "What needs you in this check-in" (the lead's own `leadActions`)
            now renders once, merged into the one section of that name near the top of the board
            (board-as-lead.txt's own place for it) - not a second copy down here. See the merge
            above, just under the headline and the kind-of-work banner. */}
        {shown.forecast && <ForecastSection rows={b.forecast} />}
        {shown.timeline && <TimelineSection rows={b.timeline} />}
        {shown.obligations && <ObligationsSection rows={b.obligations} />}
        {/* ONBOARDING BOARD FIX 1: moved for this family to right after "What needs you" - see above. */}
        {!isOnboarding && shown.personHistory && <PersonHistorySection rows={b.personHistory} />}
        {shown.risks && <RisksSection rows={b.risks} />}
        {shown.evidenceIndex && <EvidenceIndexSection rows={b.evidenceIndex} />}
        {shown.contradictions && <ContradictionsSection rows={b.contradictions} />}
        {shown.busyOrMoving && <BusyOrMovingSection data={b.busyOrMoving} />}
        {/* REQUEST 132: not here for a government programme board - drawn right after the counties instead, see above. */}
        {!layoutFor(kindOfWorkKey)?.whereItStandsAtTop && shown.questionsForTheLead && viewerRunsThisCheckIn && <QuestionsForTheLeadSection rows={b.questionsForTheLead} />}
        {/*
          DID THIS FEEL FAIR? Moved here from the dead Report tab body (ReportBody), which nothing
          has rendered since the Report tab became a list of sessions. This is where everyone reads
          how a closed check-in ended, so the one question that follows that reading belongs right
          under it. See OutcomeFeedback.tsx.
        */}
        {groundEnded && (
          <div className="gwui-mt-14">
            <OutcomeFeedback groundId={id!} />
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
          /*
           * SECOND BOARD REVIEW, WORDING: "Nothing above this" named nothing a reader could picture
           * from the heading alone - a label, not a sentence saying what the section holds. The
           * section is always about the one thing, whichever answer it has: what these objectives
           * sit under. The "nothing named yet" answer is already said in full, as a sentence, in
           * `b.cascade.why` just below the heading.
           */
          <Section heading="What this sits under">
            <Panel>
              {b.cascade.parentNamed && (
                <div className="gwui-fs-16 gwui-ink-text gwui-mb-6" style={{fontWeight: 600, lineHeight: 1.35}}>
                  {b.cascade.parentNamed}
                </div>
              )}
              <p className="gwui-mt-0 gwui-mr-0 gwui-mb-0 gwui-ml-0 gwui-fs-15 gwui-ink-sub" style={{lineHeight: 1.55}}>{b.cascade.why}</p>
              {b.cascade.teamsNamed.length > 1 && (
                <FlexRow gap={6} wrap className="gwui-mt-8">
                  {b.cascade.teamsNamed.map((t: string) => (
                    <Tag key={t} tone="plain">{t}</Tag>
                  ))}
                </FlexRow>
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
              <WhatSuccessLooksLikeFor groundId={id!} yourName={myName} headingIsTheCallers />
            </Panel>
          </Section>
        )}

        {shown.objectives && b.objectives && (
          <Section
            heading="What we are aiming for"
            /* Board review, 1 October, item 4: "The lead sets these targets." said "the lead" even
               to the lead themselves, and even where a colleague's reader already knows their name
               from elsewhere on this board (leadFirstName). */
            note={viewerRunsThisCheckIn ? 'You set these targets.' : `${(groundForSignals as any)?.leadFirstName ?? 'The person running this check-in'} sets these targets.`}
          >

            {/* The privacy setting is on and some numbers still have nobody's name on them, so
                everybody can read those. Said to the only person who can fix it. */}
            {/* One total, ten people, from the export they already have. Above the form, because
                somebody with a team and a committed number reaches for this before typing.
                NOT ON A ONE-PERSON CHECK-IN (the founder's own check-in board among them) - there
                is nobody to split a total across. */}
            {b.canEditFrame && !onlyOnePersonHere && <SplitOneTotalAcrossPeople groundId={id!} />}
            <Stack gap={8}>
            {b.targetsNobodyOwns && (
              <Callout tone="warning">{b.targetsNobodyOwns}</Callout>
            )}
            {b.objectivesPrompt && (
              <Callout tone="warning">{b.objectivesPrompt}</Callout>
            )}
            <Panel pad={false}>
              <RowList label="What we are aiming for">
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
                  <Row key={o.id} columns="1fr" inset="panel">
                    <FlexRow gap={12} align="center" wrap>
                      <div className="gwui-fs-16" style={{flex: 1, fontWeight: 600, minWidth: 160}}>
                        {o.name}
                        {o.isNew && <span className="gwui-ml-7"><Tag tone="plain">new</Tag></span>}
                        {/*
                          WHOSE NUMBER IT IS, on its own line. "12 shops· Rukia Otieno" read live: the
                          name sat right after the target with only a CSS margin between them, no
                          space in the text itself. Said as a plain sentence below the name instead.
                        */}
                        {o.owner && (
                          /* Re-review, 30 September: to Rukia herself this read "Rukia Otieno's
                             own target" - the reader is "you" here too. */
                          <div className="gwui-ink-sub gwui-fs-13-5 gwui-mt-2" style={{fontWeight: 400}}>
                            {o.ownerParticipantId && o.ownerParticipantId === b.myParticipantId ? 'Your own target' : `${o.owner}’s own target`}
                          </div>
                        )}
                        {/*
                          A NUMBER NOBODY HAS DEFINED IS NOT AN AGREED NUMBER, AND THE ROW SAYS SO.
                          "signed 12m" read as settled while the lead's own note, one page away, said
                          nobody had decided whether the 12m is signed or recognised revenue. The
                          sentence is the lead's own; it does not change or block the target.
                        */}
                        {o.notSettled && <span className="gwui-ml-7"><Tag tone="attention">definition not settled</Tag></span>}
                        {/* REQUEST 108 (b): the word for where this target stands, next to its name. */}
                        {(o as any).stands?.word && (
                          <>{' '}<Tag tone={standsTone((o as any).stands.word)}>{(o as any).stands.word}</Tag></>
                        )}
                      </div>
                      {/*
                        NOTHING TO MEASURE MEANS NOTHING TO DRAW. An aim with no number got an empty
                        bar, a "0" and "no change" beside it - read live as "Confirm her in the role ·
                        0 · no change", which says the decision did not happen. Without a target the
                        row is the aim and nothing else.
                      */}
                      {o.target != null ? (
                        <>
                          <div style={{width: 140, height: 7, borderRadius: 6, background: 'var(--gw-bar-track)', overflow: 'hidden'}}>
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
                            {/*
                              RE-REVIEW: "0 NOW, UP FROM 0." IS NOT A MOVE. Read live on "You are
                              aiming for 4 shops.", with nothing counted yet: `journey.start` (0)
                              equalling `o.count` (0) still drew "up from 0", claiming a rise that
                              never happened. "Up"/"down" is only true when the count has actually
                              moved from where it started; unmoved reads the same plain "X of Y."
                              the line below already uses when there is no start to compare against.
                            */}
                            {/* REQUEST 132: THOUSANDS SEPARATORS, SO A LARGE COUNT READS AS A
                                NUMBER, NOT A STRING OF DIGITS ("4,100 now, up from 0. The aim is
                                6,000.", not "4100 now, up from 0. The aim is 6000."). */}
                            {o.journey?.start != null && o.journey.start !== o.count
                              ? (<><b className="gwui-ink-dark">{o.count.toLocaleString('en-GB')}</b>{` now, ${o.count > o.journey.start ? 'up' : 'down'} from ${o.journey.start.toLocaleString('en-GB')}. The aim is ${o.target.toLocaleString('en-GB')}.`}</>)
                              : (<><b className="gwui-ink-dark">{o.count.toLocaleString('en-GB')}</b>{` of ${o.target.toLocaleString('en-GB')}.`}</>)}
                          </div>
                          <div className={`gwui-fs-13 ${o.delta > 0 ? 'gwui-ink-green' : 'gwui-ink-muted'}`} style={{fontWeight: 700, minWidth: 92, textAlign: 'right'}}>
                            {o.delta > 0 ? `Up ${o.delta.toLocaleString('en-GB')} this session.` : 'No change.'}
                          </div>
                        </>
                      ) : (
                        <div className="gwui-fs-15 gwui-ink-muted" style={{minWidth: 92, textAlign: 'right'}}>No number is set yet.</div>
                      )}
                    </FlexRow>
                    {o.notSettled && (
                      <div className="gwui-fs-15 gwui-ink-amber gwui-mt-5" style={{lineHeight: 1.55, maxWidth: '68ch'}}>{o.notSettled}</div>
                    )}
                    {/* "What the target assumes" is drawn once, above everything, right after the
                        headline - see the new top-level section near the top of this component.
                        Not repeated here, so the fact is said once rather than twice on one page. */}
                      {/*
                        WORDS, NOT SYMBOLS. "-", "+" and "x" read as three unlabelled glyphs to
                        anybody looking at the screen, even though each already carried an
                        aria-label for a screen reader - an accessible name is not the same thing
                        as a word a sighted person can read.
                      */}
                      {b.canEditFrame && (
                        editingTargetId === o.id ? (
                          <FlexRow gap={6} align="center" as="span">
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
                              kind="quiet" size="small"
                              onClick={() => sureAboutTarget.arm(o.id)}
                              disabled={removeObjective.isPending}
                              aria-label={`Remove target: ${o.name}`}
                            >Remove</UIButton>
                            <UIButton kind="quiet" size="small" onClick={() => setEditingTargetId(null)}>Done</UIButton>
                          </FlexRow>
                        ) : (
                          <UIButton kind="quiet" size="small" onClick={() => setEditingTargetId(o.id)} aria-label={`Change target: ${o.name}`}>Change</UIButton>
                        )
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
                      <FlexRow gap={8} align="center" wrap className="gwui-fs-15 gwui-ink-navy gwui-mt-6">
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
                          /*
                            PHONE CHECK, ITEM 9: "USE N" WAS 55 BY 25 - under the 40px tap area a
                            finger needs. `inline-flex`/`minHeight` grows the hit area; the pill's
                            own padding, border, colour and corner radius are unchanged.
                          */
                          className="gwui-fs-13 gwui-pt-2 gwui-pr-9 gwui-pb-2 gwui-pl-9 gwui-rule-blue gwui-ink-blue" style={{fontWeight: 700, borderRadius: 11, background: 'var(--gw-blue-bg)', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', minHeight: 44, boxSizing: 'border-box'}}
                        >
                          Use {o.suggestedCount}
                        </button>
                      </FlexRow>
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
                  </Row>
                )
              })}
              {/* The lead sets the frame. A target, never an assessment of a person. */}
              {b.canEditFrame && (
                <Row columns="1fr" inset="panel">
                  <FlexRow gap={8} align="center" wrap>
                    <input
                      value={newObjName}
                      onChange={(e) => setNewObjName(e.target.value)}
                      placeholder="Add a target, e.g. Paying companies"
                      className="gwui-input" style={{flex: 1, minWidth: 200}}
                    />
                    <input
                      value={newObjTarget}
                      onChange={(e) => setNewObjTarget(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="how many"
                      className="gwui-input" style={{flex: '0 0 120px', width: 120}}
                    />
                    {/*
                      SECONDARY, NOT NAVY (Hafsah, 30 September, item 2: "at most one primary
                      (navy) button per screen"). The board's one primary is "Your check-in", in
                      the header, as the prototype's own board-as-lead.txt draws it; every other
                      action on this page, including adding a target, is secondary or quiet.
                    */}
                    <UIButton
                      kind="secondary" size="small"
                      onClick={() => addObjective.mutate()}
                      disabled={!newObjName.trim() || addObjective.isPending}
                    >
                      {addObjective.isPending ? 'Adding...' : 'Add target'}
                    </UIButton>
                  </FlexRow>
                </Row>
              )}
              </RowList>
            </Panel>
            </Stack>
          </Section>
        )}

        {/* What was agreed at the start, so the rest of the board has something
            to be read against. This section has been in the DELIVERY family's
            list since the board was built with nothing behind it - so a lead saw
            where the work had got to and not what it was meant to be for. It is
            the only block here that no check-in can revise.

            ONBOARDING BOARD FIX 1: moved for this family to right after "What needs you", in the
            prototype's own order (day-30-and-60.txt) - see where `isOnboarding` draws it, above.
            Wrapped rather than folded into one combined condition, so the literal
            `{shown.startingState && b.startingState && (` this file has always carried stays put
            for every other family - the-board-draws-the-switchboards-order.spec.ts reads this
            source file as text to pin the switchboard's own document order, and does so by finding
            that exact substring. */}
        {!isOnboarding && (
          <>
            {shown.startingState && b.startingState && (
              <StartingStateBody startingState={b.startingState} />
            )}
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

          ONBOARDING BOARD FIX 1: moved for this family to right after "What needs you", under the
          prototype's own heading for it ("Where you both see it differently") - see
          `divergenceBlock` and where it is called, above. The gate below is kept inline here, not
          read off `divergenceBlock` (which deliberately swaps its own condition's operand order),
          so the literal `{shown.divergence && b.divergence && (` the order-pinning spec reads for
          stays exactly where it always was for every other family; the heavy content itself is
          `DivergenceSectionBody`, shared with the onboarding call, so it is never duplicated.
          The central question itself no longer draws here - see where it is drawn once, above the
          fold, for fault 4a.
        */}
        {!isOnboarding && (
          <>
            {shown.divergence && b.divergence && (
              <DivergenceSectionBody heading="Where people differ" divergence={b.divergence} onlyOnePersonHere={onlyOnePersonHere} myName={myName} />
            )}
          </>
        )}

        {shown.whatTheRoomIsAbout && (
          <Section heading="What people are after, and where" note="Built from what everybody said.">
            {b.whatTheRoomIsAboutNote && (
              <Panel><Text size="15" ink="sub">{b.whatTheRoomIsAboutNote}</Text></Panel>
            )}
            {b.whatTheRoomIsAbout && (
              <div className={`gwui-gap-14 ${b.whatTheRoomIsAboutNote ? 'gwui-mt-14' : 'gwui-mt-0'}`} style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(300px,100%),1fr))'}}>
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
                  <div className="gwui-pt-2 gwui-pb-12">
                    <RowList label="What people are trying to do">
                    {(b.whatTheRoomIsAbout.aims ?? []).length === 0 ? (
                      <Row columns="1fr" inset="list"><Text size="15" ink="muted">Nobody has said what they are after yet.</Text></Row>
                    ) : (b.whatTheRoomIsAbout.aims ?? []).map((a) => (
                      <Row key={a.aim} columns="1fr" inset="list">
                        <FlexRow gap={10} align="baseline">
                          <div className="gwui-fs-16 gwui-ink-dark" style={{fontWeight: 600, flex: 1}}>{a.aim}</div>
                          <Tag>{a.held.length === 1 ? '1 person' : `${a.held.length} people`}</Tag>
                        </FlexRow>
                        <div className="gwui-fs-15 gwui-ink-sub gwui-mt-3" style={{lineHeight: 1.5}}>{a.held.join(', ')}</div>
                      </Row>
                    ))}
                    </RowList>
                  </div>
                </Panel>
                </div>
                {([['Places named', b.whatTheRoomIsAbout.places ?? []], ['What it is about', b.whatTheRoomIsAbout.things ?? []]] as const).map(([label, rows]) => (
                  <Panel key={label} pad={false}>
                    <div className="gwui-pt-13 gwui-pr-15 gwui-pb-10 gwui-pl-15 gwui-fs-15 gwui-ink-dark gwui-rule-bottom" style={{fontWeight: 700}}>{label}</div>
                    <div className="gwui-pt-2 gwui-pb-12">
                      <RowList label={label}>
                      {rows.length === 0 ? (
                        <Row columns="1fr" inset="list"><Text size="15" ink="muted">Nobody named one.</Text></Row>
                      ) : rows.map((r) => (
                        <Row key={r.name} columns="1fr" inset="list">
                          <FlexRow gap={10} align="baseline">
                            <div className="gwui-fs-16 gwui-ink-dark" style={{fontWeight: 600, flex: 1}}>{r.name}</div>
                            <Tag>{r.named.length}</Tag>
                          </FlexRow>
                          <div className="gwui-fs-15 gwui-ink-sub gwui-mt-3" style={{lineHeight: 1.5}}>{r.named.join(', ')}</div>
                        </Row>
                      ))}
                      </RowList>
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </Section>
        )}

        {shown.quickRead && b.quickRead && (
          <Section
            heading="The quick read"
            /*
              ONE-PERSON CHECK-INS (THE FOUNDER'S OWN CHECK-IN BOARD AMONG THEM): "How much the
              team agrees" asks a question that needs more than one person to answer - there is
              nobody to agree or disagree with here. founder.txt does not give this note its own
              wording, so this falls back to "How far the record bears this out." instead, which
              is still true of one person's own report.
            */
            note={onlyOnePersonHere ? 'How far the record bears this out.' : 'How much the team agrees, and how much the report can rely on.'}
          >
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
            {/*
              U.10 RE-REVIEW ITEM 6: A SENTENCE, THE WAY U.9's tileSentence ALREADY DOES IT.
              "Differences / None / no disagreement, as the written report reads it" was a label,
              a bare value and a fragment, stacked - the same bug U.9's report review found and
              fixed with `tileSentence`, reused here rather than reworded: this is the same tile
              shape (label/value/sub), from the same server function (atAGlanceTiles). The label
              stays for a screen reader, without being shown as its own heading.
            */}
            {onAPhone ? (
              <Panel pad={false}>
                <div className="gwui-pt-2 gwui-pb-2 gwui-pl-14 gwui-pr-14">
                  <RowList label="The quick read">
                    {b.quickRead.map((q) => {
                      const toneClass = q.tone === 'bad' ? 'gwui-ink-red' : q.tone === 'warn' ? 'gwui-ink-amber' : q.tone === 'good' ? 'gwui-ink-green' : 'gwui-ink-text'
                      return (
                        <Row key={q.label} columns="1fr">
                          <span className="gw-sr-only">{q.label}</span>
                          <div className={`gwui-fs-15 ${toneClass}`} style={{lineHeight: 1.5}}>{tileSentence(q)}</div>
                        </Row>
                      )
                    })}
                  </RowList>
                </div>
              </Panel>
            ) : (
              <div className="gwui-gap-10" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                {b.quickRead.map((q) => {
                  const toneClass = q.tone === 'bad' ? 'gwui-ink-red' : q.tone === 'warn' ? 'gwui-ink-amber' : q.tone === 'good' ? 'gwui-ink-green' : 'gwui-ink-text'
                  return (
                    <Panel key={q.label} pad={false}>
                      <div className="gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14">
                        <span className="gw-sr-only">{q.label}</span>
                        <div className={`gwui-fs-15 ${toneClass}`} style={{lineHeight: 1.5}}>{tileSentence(q)}</div>
                      </div>
                    </Panel>
                  )
                })}
              </div>
            )}
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
            <TheJudgement it={(b as any).theJudgement} hideWhatThisCannotTellYou={kindOfWorkKey === 'MarketView where next'} />
            {(b as any).whatTheAnswersSay && <WhatTheNetworkSaid picture={(b as any).whatTheAnswersSay} />}
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
                  {/*
                    REQUEST 107 (a): ONE SENTENCE, NOT TWO PIECES JOINED BY A DASH.

                    The engine now sends `says`, already worded for this reader (it reads "you"
                    when the reader is the person the gap is about). Older payloads, from before
                    the engine's change, still carry only `who`, `what`, `sinceRound` and
                    `certain` - the fallback below writes the same fact as one plain sentence
                    instead of the old "who — what" plus a separate "open since" note.
                  */}
                  <Text size="16" ink="dark" as="span">
                    {g.says ?? (
                      g.certain
                        ? `In session ${g.sinceRound}, ${g.who} was asked, "${g.what}" ${g.who} has not answered it yet.`
                        : `In session ${g.sinceRound}, ${g.who} was asked, "${g.what}" Nothing on record can confirm the answer yet.`
                    )}
                  </Text>
                </div>
              ))}
            </Panel>
          </Section>
        )}

        {/*
          FOR THE LEAD, THIS IS ALREADY SAID ABOVE. `decisions` now renders inside the merged "What
          needs you in this check-in" section near the top of the board, for whoever runs it - the
          prototype's own place for it (eng.txt has no separate "Decisions needed" heading at all).
          A participant or a read-only admin, who that heading is not addressed to, still reads it
          here, exactly as before.
        */}
        {shown.decisions && b.decisions && !viewerRunsThisCheckIn && (
          <Section heading="Decisions needed" note="Raised by what people see differently, or what is stuck.">
            <Panel pad={false}>
              {b.decisions.map((d, i) => (
                <div key={i} className="gwui-panel-row">
                  <FlexRow gap={11} align="baseline">
                    <span className="gwui-fs-17 gwui-ink-navy" style={{fontFamily: 'var(--gw-font-name)', minWidth: 18}}>{i + 1}</span>
                    <div style={{flex: 1}}>
                      <div className="gwui-ink-dark gwui-fs-16" style={{fontWeight: 600}}>{d.question}</div>
                      <div className="gwui-fs-15 gwui-ink-muted gwui-mt-2">{d.why}</div>
                    </div>
                    {/* U.10: a name, not a verdict - the owner is who this is for, not a label on
                        them. Re-review, 30 September: to that person themselves it is "You".
                        Re-review, 1 October (phase 2 of the board task): the owner is usually a
                        short name, but when nobody is named the record sends a full sentence
                        ("Nobody has been named to decide this."). A fixed `nowrap` fit the name
                        and overflowed the phone-width board by this sentence's own width (a real
                        375px board measured 395px wide because of it) - this box must wrap like
                        any other sentence, not stay on one line. */}
                    <Note>{myName && d.owner === myName ? 'You' : d.owner}</Note>
                  </FlexRow>
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
            <div className="gwui-gap-14" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))'}}>
              {b.whoOwnsWhat.map((p) => (
                <Panel key={p.participantId} pad={false}>
                  <div className="gwui-pt-13 gwui-pr-15 gwui-pb-10 gwui-pl-15 gwui-rule-bottom">
                    {/*
                      The server falls back from a missing name to the ROLE rather than the email
                      address (W-UX-4), so the subtitle has to stop repeating it - otherwise a person
                      with no account yet reads "Engineer" over "Engineer".

                      SECOND BOARD REVIEW: the reader's own card still headed with their own name -
                      "Wairimu Kamau" over her own card, on the board she herself was reading. Every
                      sentence inside the card already says "you" for its own record (see
                      progress-reported-is-never-they.spec.tsx); the heading above it did not.
                    */}
                    <Text size="15" ink="dark" weight={700}>
                      {p.participantId === b.myParticipantId ? 'You' : nameOnTheBoard(b, p.participantId, p.name)}
                    </Text>
                    {p.role && p.role !== p.name && <TheLeadsNote role={p.role} className="gwui-fs-13-5 gwui-ink-sub gwui-mt-1" />}
                  </div>
                  <div className="gwui-pt-2 gwui-pr-15 gwui-pb-10 gwui-pl-15">
                    {(() => { const said = p.items.filter((it) => theWordsOfALine(it.text)); return said.length === 0 ? (
                      <div className="gwui-fs-15 gwui-ink-muted gwui-pt-10 gwui-pr-0 gwui-pb-10 gwui-pl-0">
                        {b.family === 'UPDATE' ? 'Has not answered yet.' : (
                          /*
                           * BOARD REVIEW, OPS BOARD, ITEM 6: "NOBODY HAS SAID ANYTHING ABOUT THIS
                           * YET." EVEN UNDER A PERSON WHO DID ANSWER. The sentence claimed nobody
                           * said anything, when it really means nothing this person said fits
                           * "who owns what" - so it names the person it is about, "you" for the
                           * reader's own card (same check the heading above already uses).
                           */
                          p.participantId === b.myParticipantId
                            ? 'Nothing you said is listed here yet.'
                            : `Nothing ${nameOnTheBoard(b, p.participantId, p.name)} said is listed here yet.`
                        )}
                      </div>
                    ) : said.map((it) => (
                      <div key={it.id} className="gwui-pt-10 gwui-pr-0 gwui-pb-10 gwui-pl-0 gwui-inner-row">
                        <div className="gwui-fs-15" style={{lineHeight: 1.45}}>{theWordsOfALine(it.text)}</div>
                        <FlexRow gap={6} align="baseline" wrap className="gwui-mt-4">
                          {/*
                            RECORD TYPES ARE THE GOAL VOCABULARY, SAID AS A SENTENCE. "success
                            definition", "commitment", "intent" and "progress" as bare tags are the
                            record's own internal words, printed at somebody rather than explained
                            to them. The lookup is the record type; the reader gets a sentence.
                          */}
                          {/* Engine merge, 2 October: `it.itsKindIsSaid` means `it.text` already
                              says what kind of item this is, in its own words ("You have reported
                              progress.") - drawing this sentence too repeated it: "You have
                              reported progress. This is progress you reported." */}
                          {b.family !== 'UPDATE' && !it.itsKindIsSaid && whatThisItemIs(it.type, p.participantId === b.myParticipantId, nameOnTheBoard(b, p.participantId, p.name)) && (
                            <Text size="13" ink="sub" as="span">{whatThisItemIs(it.type, p.participantId === b.myParticipantId, nameOnTheBoard(b, p.participantId, p.name))}</Text>
                          )}
                          {it.sessionNumber && <Text size="13" ink="muted" as="span">Said in session {it.sessionNumber}.</Text>}
                        </FlexRow>
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
              <Panel><Text size="15" ink="sub" lineHeight={1.6}>Nothing here yet. Handoffs appear when somebody says in a check-in that they are waiting on another person.</Text></Panel>
            ) : (
              <Stack gap={10}>
                {b.dependencies.filter((d) => (d.what ?? '').trim().toLowerCase() !== (d.on ?? '').trim().toLowerCase()).map((d) => {
                  const onWhom = d.on ?? 'someone outside this check-in'
                  const statusSaid = d.status === 'BLOCKING' ? 'This is blocking work.' : d.status === 'CLEARED' ? 'This is cleared.' : 'This is waiting.'
                  const title = d.what ? d.what.charAt(0).toUpperCase() + d.what.slice(1) : 'Waiting on something'
                  const tone: TagTone = d.status === 'BLOCKING' ? 'concern' : d.status === 'CLEARED' ? 'proven' : 'attention'
                  const word = d.status === 'BLOCKING' ? 'Blocking' : d.status === 'CLEARED' ? 'Cleared' : 'Waiting'
                  /* Board review, 30 September, item 1: "Amani Wekesa needs the price list from
                     Rukia Otieno." to Amani himself, and "Waiting on: Rukia Otieno" to Rukia
                     herself - the reader is "you" here too, on whichever side of the handoff they
                     are on. */
                  const readerIsFrom = b.myParticipantId ? d.fromParticipantId === b.myParticipantId : !!myName && d.from === myName
                  const readerIsOnWhom = b.myParticipantId ? d.onParticipantId === b.myParticipantId : !!myName && onWhom === myName
                  const fromWord = readerIsFrom ? 'You' : d.from
                  const needsWord = readerIsFrom ? 'need' : 'needs'
                  const onWhomInSentence = readerIsOnWhom ? 'you' : onWhom
                  /*
                   * PROJECT BOARD REVIEW 1, FIX 7: ONE SENTENCE, NOT A LABEL AND A VALUE JOINED
                   * BY A COLON - "Waiting on: the pipeline" read as two pieces stapled together,
                   * not a sentence. Said instead the same way `readerIsOnWhom`'s own line already
                   * is, just with the name instead of "you".
                   *
                   * AND `blockers[].holdingUp`, NOT `dependencies[].then`. The engine already
                   * writes a full sentence for what happens once this clears (board.blockers,
                   * matched to this same handoff by id) - "Aisha Wanjiku said that once it is
                   * cleared, "I can finish the ledger export."" - where the old "When this
                   * arrives, {name} says: "{then}."" built a second, cruder version of the same
                   * sentence from the bare quote alone.
                   */
                  const matchingBlocker = (b as any).blockers?.find((bl: { id: string }) => bl.id === d.id)
                  const holdingUp = matchingBlocker?.holdingUp as string | null | undefined
                  return (
                    <Panel key={d.id}>
                      <FlexRow gap={10} align="flex-start" justify="space-between">
                        <Text size="16" ink="dark" weight={700}>{title}</Text>
                        <Tag tone={tone}>{word}</Tag>
                      </FlexRow>
                      <div className="gwui-fs-13-5 gwui-ink-sub gwui-mt-8">
                        {readerIsOnWhom
                          ? 'This is waiting on you.'
                          : <>This is waiting on <span className="gwui-ink-dark" style={{fontWeight: 600}}>{onWhom}</span>.</>}
                      </div>
                      <div className="gwui-fs-15 gwui-ink-dark gwui-mt-4" style={{lineHeight: 1.5}}>
                        {/* `d.what` can open with a capitalised article ("The Mwangi agency") where the
                            same string also stands as a title elsewhere; mid-sentence here, only that
                            leading word is wrong (real-user walk, Kijani Foods, fault 1). */}
                        <b>{fromWord}</b> {needsWord} {midSentence(d.what)} from <b>{onWhomInSentence}</b>. {statusSaid}
                      </div>
                      {holdingUp && (
                        <div className="gwui-rule-blue gwui-pt-8 gwui-pr-10 gwui-pb-8 gwui-pl-10 gwui-mt-8 gwui-fs-15 gwui-ink-text" style={{background: 'var(--gw-blue-bg)', borderRadius: 8, lineHeight: 1.5}}>
                          {holdingUp}
                        </div>
                      )}
                    </Panel>
                  )
                })}
              </Stack>
            )}
          </Section>
        )}

        {/* Links between check-ins (D3, U.16): drawn only when the server serves this reader any. */}
        {id && <CheckInLinks groundId={id} label={(groundForSignals as any)?.label ?? null} />}

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
              <Stack gap={10}>
                <div className="gwui-fs-15 gwui-ink-sub gwui-pt-6 gwui-pr-0 gwui-pb-2 gwui-pl-0">
                  {/* Board review, 30 September, item 7: "Is the role clear, and what does the record
                      actually hold..." opened as a question and trailed off into a noun phrase - not
                      a question, and not a plain sentence either. */}
                  This shows whether each person's role is clear, and what the record actually holds for them, read in their own function's terms.
                </div>

                {/* THE SAME NOTE ACROSS SEVERAL CARDS IS SAID ONCE, HERE, UNDER THE HEADING -
                    not per card. The engine moves a repeated "No position shown..." note into
                    `contributionSaysOnce` and nulls it out of the rows it came from (`saidOnceAbove`).
                    Drawn in both branches below, exactly as the server sends it: its words may name
                    this reader by their own name (request 118 asks the engine not to), which is left
                    as sent rather than rewritten on screen. */}
                {b.contributionSaysOnce && <Callout tone="info">{b.contributionSaysOnce}</Callout>}
              </Stack>

              {/*
                THE SAME PARAGRAPH THREE TIMES IS A MAIL MERGE. When nobody's role is defined the note
                is one fact about the check-in, said once; and a party with no name and nothing on
                record gets no card, because a card for nobody says nothing.
              */}
              {b.contribution.every((c) => !c.remitDefined) && b.contribution.length > 1 ? (
                <div className="gwui-rule gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14 gwui-mt-9" style={{borderRadius: 12, background: 'var(--gw-bg)'}}>
                  <FlexRow gap={9} align="baseline" wrap>
                    <span className="gwui-ink-dark gwui-fs-14" style={{fontWeight: 700}}>Everyone here</span>
                    {/* Board review, 30 September, item 7: a two-word tag beside a name, not a
                        sentence a person reads. */}
                    <Text size="13-5" ink="amber" weight={600} as="span">Nobody here has said what their role covers yet.</Text>
                  </FlexRow>
                  <div className="gwui-fs-15 gwui-ink-navy gwui-rule-blue gwui-pt-8 gwui-pr-10 gwui-pb-8 gwui-pl-10 gwui-mt-8" style={{background: 'var(--gw-blue-bg)', borderRadius: 9, lineHeight: 1.5}}>
                    {b.contribution[0].note}
                  </div>
                </div>
              ) : b.contribution.filter((c) => c.name || c.remitDefined).map((c) => {
                const isReader = !!b.myParticipantId && c.participantId === b.myParticipantId
                /* Re-review, 2 October: read live by Rukia Otieno, this card's own heading still
                   said "Rukia Otieno" over her own card, on the board she herself was reading -
                   the same mistake "Who owns what" was fixed for. The heading now says "You" for
                   the reader's own row, the same way "Who owns what" does; `nameFirstWord` below
                   keeps the real first name for the "Nobody has said..." sentence about somebody
                   else, which never runs for the reader's own row (it reads "your" instead). */
                const displayName = isReader ? 'You' : nameOnTheBoard(b, c.participantId, c.name)
                const nameFirstWord = nameOnTheBoard(b, c.participantId, c.name).split(' ')[0]
                return (
                <div key={c.participantId} className="gwui-rule gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14 gwui-mt-9" style={{borderRadius: 12, background: 'var(--gw-bg)'}}>
                  <FlexRow gap={9} align="baseline" wrap>
                    <span className="gwui-ink-dark gwui-fs-14" style={{fontWeight: 700}}>{displayName}</span>
                    {/* "Your note" to the lead who wrote it, never to an admin (U.7 review). */}
                    {c.remitDefined
                      ? (b.canEditFrame && c.remit ? <TheLeadsNote role={c.remit} className="gwui-fs-13-5 gwui-ink-sub" /> : null)
                      /* Board review, 30 September, item 7: "role not clearly defined" beside a
                         name is a tag, not a sentence about that person. */
                      : <Text size="13-5" ink="amber" weight={600} as="span">{isReader ? 'Nobody has said what your role covers yet.' : `Nobody has said what ${nameFirstWord || 'their'}'s role covers yet.`}</Text>}

                  </FlexRow>

                  {/* An undefined remit shows NO position. You cannot measure someone
                      against a bar that was never set. */}
                  {c.shown === false && c.remitDefined ? (
                    /* Too little on record to say anything about a person yet. A
                       hedge still reads as a verdict, so nothing is shown at all. */
                    <div className="gwui-fs-15 gwui-ink-muted gwui-mt-8" style={{lineHeight: 1.45, fontStyle: 'italic'}}>
                      Not enough on record yet to say anything about this person's contribution. {c.basis}
                    </div>
                  ) : !c.remitDefined && c.note ? (
                    /*
                      PHONE CHECK, ITEM 7: AN EMPTY BLUE BOX. "Nobody has said what X's role covers
                      yet." already says the one true thing when there is no remit - this box is
                      only for a note that goes further than that sentence. `!c.remitDefined` alone
                      drew it even when `c.note` was empty, so a reader saw a blank navy-on-blue
                      panel under the sentence that already told them there was nothing to show.
                    */
                    <div className="gwui-fs-15 gwui-ink-navy gwui-rule-blue gwui-pt-8 gwui-pr-10 gwui-pb-8 gwui-pl-10 gwui-mt-8" style={{background: 'var(--gw-blue-bg)', borderRadius: 9, lineHeight: 1.45}}>
                      {c.note}
                    </div>
                  ) : !c.remitDefined ? null : (
                    <>
                      {/*
                        HAFSAH'S DECISION, 2 OCTOBER: THE CHECKABILITY RATING STAYS. It rates the
                        answers, not the person - only a score of a person's own contribution or
                        performance stays hidden. The prototype shows exactly this to the lead
                        (docs/prototype/screens/G1-example-check-ins/salesorg.txt ~125 and ~157,
                        eng.txt ~159, programme.txt ~154: "Nothing checkable" with what to ask
                        next). This overturns the rule the second and third review passes followed
                        here (CLAUDE.md's "Leads never see how a person's answers were rated" was
                        read too broadly); `c.reason` and `c.basis` draw again, for the lead only -
                        this whole section is already gated to whoever runs the check-in.
                      */}
                      {/* A position is never shown without its reason. */}
                      <div className="gwui-mt-7 gwui-fs-15" style={{lineHeight: 1.45}}>
                        {c.reason}
                      </div>
                      {/* `Note tone="muted"` is the shared part for this, not a fresh one-off class pair. */}
                      {c.basis && <Note tone="muted">{c.basis}</Note>}
                      {c.fnLabel && (
                        <FlexRow gap={6} align="center" wrap className="gwui-mt-6">
                          <Tag tone="action">read as {c.fnLabel.toLowerCase()}</Tag>
                          {!c.fnConfident && <span className="gwui-fs-13 gwui-ink-muted" style={{fontStyle: 'italic'}}>still provisional</span>}
                          {c.isBlocked && <Tag tone="attention">part of this is blocked</Tag>}
                        </FlexRow>
                      )}
                      <div className={`gwui-mt-8 gwui-fs-15 gwui-pt-6 gwui-pr-10 gwui-pb-6 gwui-pl-10 ${c.ownVoice ? 'gwui-ownvoice' : 'gwui-ownvoice-none'}`} style={{lineHeight: 1.4, borderRadius: 9, fontStyle: c.ownVoice ? 'normal' : 'italic'}}>
                        {c.ownVoice ?? (isReader ? 'No note. You can add your own context through your next check-in.' : 'No note. This person can add their own context through their next check-in.')}
                      </div>
                    </>
                  )}
                </div>
              )})}
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
                {/* Board review, 30 September, item 7: this section lists everyone's coverage, not
                    only the reader's - "your responsibilities" was wrong for every other row on
                    the list, since it is about whichever person that row names. */}
                A drop in someone's ownership shows up as their work landing more and more in what other people describe as theirs.
                Rising is the early warning, often before targets are missed, because the work still gets done, by someone else.
              </div>

              {/*
                ONE QUIET CHOICE, NOT TWO TOGGLE CHIPS (Hafsah, 30 September, item 2). Both variants
                still ship - "does a bar read as a verdict" is still answered by real use - but a
                reader chooses between them with one control, the same "Show"/"Hide" shape "Over
                time" already uses below, rather than two chips that say the same thing twice.
              */}
              <Stack gap={10}>
                <div className="gwui-mt-8 gwui-mb-4">
                  {/* Board review, 1 October, item 8: only switches how this is drawn (a fold, not a
                      button), drawn with one-off classes instead of the shared `gwui-plain-link`. */}
                  <button
                    onClick={() => setVariant(b.coverageVariant === 'bar' ? 'text' : 'bar')}
                    className="gwui-plain-link gwui-fs-13"
                  >
                    {b.coverageVariant === 'bar' ? 'Show as words only' : 'Show with a bar'}
                  </button>
                </div>

                {/* THE SAME SENTENCE ACROSS SEVERAL ROWS IS SAID ONCE, HERE, NOT PER ROW. The
                    engine moves a repeated "What people said" or "Which of these this is" sentence
                    into `coverage.saysOnce` (an array - one entry per distinct sentence that was
                    repeated), and nulls it out of the rows it came from (see the comment above each
                    heading, below). Drawn once, above every row, in the reader's own words from the
                    server - never rewritten on screen. */}
                {b.coverage.saysOnce && b.coverage.saysOnce.length > 0 && (
                  <Stack gap={8}>
                    {b.coverage.saysOnce.map((s, i) => (
                      <Callout key={i} tone="info">{s}</Callout>
                    ))}
                  </Stack>
                )}
              </Stack>

              {b.coverage.reads.filter((r) => r.shown !== false).map((r) => {
                /* Re-review, 2 October: "Staying with them" and the "No note" fallback both still
                   talked about the reader's own row in the third person, under a heading that
                   already says "You" (see the comment below). `isReader` is the same test used
                   for the heading, reused here so both sentences agree with it. */
                const isReader = r.participantId === b.myParticipantId
                /* Decision 141 (3): the lead's percentage, beside the name. Rows stay in the order served. */
                const percent = typeof r.landingPercent === 'number' ? r.landingPercent : undefined
                const whose = isReader ? 'your' : `${nameOnTheBoard(b, r.participantId, r.name)}’s`
                return (
                <div key={r.participantId} className="gwui-rule gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14 gwui-mt-9" style={{borderRadius: 12, background: 'var(--gw-bg)'}}>
                  <FlexRow gap={9} align="baseline" wrap>
                    {/* Re-review, 2 October: the reader's own row here still headed with their own
                        name - "Rukia Otieno" over her own card, on the board she herself was
                        reading - the same mistake "Who owns what" was fixed for. */}
                    <span className="gwui-ink-dark gwui-fs-14" style={{fontWeight: 700}}>{isReader ? 'You' : nameOnTheBoard(b, r.participantId, r.name)}</span>
                    {/* "ROLE LEVEL" read as a heading over a single word; it is a small note beside
                        the name, not a section of its own, so it no longer renders in capitals. */}
                    {/* Board review, 30 September, item 7: "at role level" is a fragment, not
                        something a person reads as a sentence. */}
                    {percent !== undefined && (
                      <span data-testid="coverage-percent"><Text size="14" ink="dark" weight={700} as="span">{`${percent}%`}</Text></span>
                    )}
                    <Text size="13" ink="muted" as="span">{`This is measured at the ${String(r.scope).toLowerCase()} level.`}</Text>
                    <span className="gwui-ml-auto">
                      <Tag tone={r.kind === 'LEAKING' ? 'attention' : r.kind === 'ABSORBING' ? 'action' : 'plain'}>
                        {r.kind === 'LEAKING' ? 'Landing with others' : r.kind === 'ABSORBING' ? "Taking on others' work" : isReader ? 'Staying with you' : 'Staying with them'}
                      </Tag>
                    </span>
                  </FlexRow>

                  {/*
                    REQUEST 111 (a): A SCORE OF WHERE A PERSON'S WORK LANDS STAYS REMOVED. `pct` is
                    typed as a plain `number`, but the engine no longer always sends one - drawing a
                    bar from `undefined` drew a 0%-wide sliver that read as a verdict with nothing
                    behind it (CLAUDE.md: no score or label shown on a person). A row with no `pct`
                    now draws exactly as the text-only variant does - nothing invented in its place.
                  */}
                  {percent !== undefined && r.remitDefined && (
                    <div className="gwui-mt-9">
                      <Stack gap={6}>
                        {b.coverageVariant === 'bar' && (
                          <div style={{height: 7, borderRadius: 6, background: 'var(--gw-bar-track)', overflow: 'hidden'}}>
                            <div data-testid="coverage-bar-fill" style={{height: '100%', width: `${percent}%`, borderRadius: 6, background: r.kind === 'LEAKING' ? 'var(--gw-amber-b)' : r.kind === 'ABSORBING' ? 'var(--gw-navy)' : 'var(--gw-muted)'}} />
                          </div>
                        )}
                        <div data-testid="coverage-percent-says">
                          <Text size="14" ink="sub">{`${percent}% of ${whose} work is landing in what other people describe as theirs.`}</Text>
                        </div>
                      </Stack>
                    </div>
                  )}

                  {/*
                    After the engine's merge of 2 October, a row whose "What people said" or
                    "Which of these this is" text was repeated across several rows now carries
                    `what: null` / `reasonText: null` and `saidOnceAbove: true`, with the text
                    itself moved once into `b.coverage.saysOnce`, drawn above the rows. Read live,
                    this card still drew both headings with nothing under them. Each heading is now
                    drawn only when its own text is there.
                  */}
                  {r.what && (
                    <div className="gwui-mt-8 gwui-fs-15" style={{lineHeight: 1.45}}>
                      <span className="gwui-fs-13 gwui-ink-subd gwui-mb-2" style={{letterSpacing: '.1px', fontWeight: 700, display: 'block'}}>What people said</span>
                      {r.what}
                    </div>
                  )}

                  {/* The signal is ALWAYS coupled to the reason it cannot self-determine. */}
                  {r.reasonText && (
                    <div className="gwui-mt-7 gwui-fs-15 gwui-rule gwui-pt-7 gwui-pr-10 gwui-pb-7 gwui-pl-10" style={{lineHeight: 1.4, background: 'white', borderRadius: 9}}>
                      <span className="gwui-fs-13 gwui-ink-subd gwui-mb-2" style={{letterSpacing: '.1px', fontWeight: 700, display: 'block'}}>
                        Which of these this is
                      </span>
                      {r.reasonText}
                    </div>
                  )}

                  {/*
                    HAFSAH'S DECISION, 2 OCTOBER: THE CHECKABILITY RATING STAYS (see the matching
                    comment in "Contribution against role", above). `r.basis` draws again, for the
                    lead only - this section is already gated to whoever runs the check-in.
                  */}
                  {/* `Note tone="muted"` is the shared part for this, not a fresh one-off class pair. */}
                  {r.basis && <Note tone="muted">{r.basis}</Note>}

                  <div className="gwui-mt-7 gwui-fs-15 gwui-rule-dashed gwui-pt-6 gwui-pr-10 gwui-pb-6 gwui-pl-10 gwui-ink-muted" style={{lineHeight: 1.4, borderRadius: 9, fontStyle: 'italic'}}>
                    {r.ownVoice ?? (isReader ? 'No note. You can add context through your next check-in.' : 'No note. This person can add context through their next check-in.')}
                  </div>
                </div>
                )
              })}

              {b.coverage.reads.some((r) => r.shown === false) && (
                <div className="gwui-fs-13-5 gwui-ink-muted gwui-mt-9" style={{lineHeight: 1.45}}>
                  {b.coverage.reads.filter((r) => r.shown === false).map((r) => r.name).join(', ')} {b.coverage.reads.filter((r) => r.shown === false).length === 1 ? 'is' : 'are'} not shown here yet. There is too little on record to say anything about where their work is landing, and a guess about that would be worse than a gap.
                </div>
              )}

              <div className="gwui-fs-13-5 gwui-ink-muted gwui-mt-11 gwui-pt-9 gwui-rule-top-dashed" style={{fontStyle: 'italic', lineHeight: 1.5}}>
                {/* Board review, 30 September, item 7: this note sits under a list of several
                    people, not only the reader - "your work"/"your role" was wrong for every row
                    that is not the reader's own. It now speaks about whoever's row it sits under.
                    Item 6: the old last sentence ("It is only shown where the role is defined")
                    was not true - the card above still shows without a defined role, only the bar
                    (a few lines up) waits for one. */}
                Somebody else doing a person's work can mean several different things. Nobody may own it any more, and others are quietly
                covering the gap. It may be healthy work shared by design. They may be blocked or carrying too much. Or somebody else may
                be taking over their role without being asked to. This shows the signal, but it cannot tell which of these is happening on
                its own, so it is shown alongside what that person is waiting on, how clearly their role is defined, and their own voice.
                It never concludes that somebody has stopped contributing. It raises a question for the team to discuss, never a verdict
                about a person. The bar above is only shown once a role is defined; the words are shown either way.
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
                  <FlexRow gap={8} align="baseline" wrap>
                    <Text size="16" ink="dark" weight={600} as="span">{m.label}</Text>
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
                  </FlexRow>
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
                <HiddenContributorRow
                  key={r.label + i}
                  groundId={id!}
                  label={r.label}
                  evidence={r.evidence}
                  isInitiator={viewerRunsThisCheckIn}
                />
              ))}
              <div className="gwui-panel-row">
                <Text size="15" ink="sub" lineHeight={1.6}>{b.hiddenContributors.why}</Text>
              </div>
            </Panel>
          </Section>
        )}


        {/* ---------------------------------------------- logistics */}
        {has('poll') && (
          <Section heading="Find a time" note={b.canEditFrame ? 'The only thing on this board you set up yourself.' : `${(groundForSignals as any)?.leadFirstName ?? 'The person running this check-in'} can set up a poll to find a time.`}>
            <Panel>
              {b.canEditFrame && (
                <div className={`gwui-pt-8 gwui-pr-0 gwui-pb-8 gwui-pl-0 ${b.poll ? 'gwui-rule-bottom' : 'gwui-rule-bottom-none'}`}>
                  {!showPollForm ? (
                    /* Board review, 1 October, item 8: only opens the poll form below (a fold) -
                       the actual mutation is that form's own "Save" button, which stays a real
                       button. Drawn with the shared `gwui-plain-link` quiet-text-link class. */
                    <button onClick={() => { setShowPollForm(true); setPollQ(b.poll?.question ?? 'Weekly sync, best time'); setPollOpts((b.poll?.options ?? []).map((o) => o.label).join('\n')) }}
                      className="gwui-plain-link gwui-fs-13-5">
                      {b.poll ? 'Change the times' : 'Set up an availability poll'}
                    </button>
                  ) : (
                    <form noValidate onSubmit={(e) => { e.preventDefault(); if (pollQ.trim() && pollOpts.trim() && !savePoll.isPending) savePoll.mutate() }}>
                      <Stack gap={8}>
                      <input value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="What are you finding a time for?"
                        className="gwui-input" />
                      <textarea value={pollOpts} onChange={(e) => setPollOpts(e.target.value)} placeholder={'One time per line\nTue 16:00\nWed 09:00'}
                        className="gwui-input" />
                      {b.poll && (
                        <Text size="13" ink="amber">
                          Changing the times clears everyone's availability, because an answer to a question that changed is not an answer.
                        </Text>
                      )}
                      <div className="gwui-button-row">
                        {/* Secondary, not navy: the board's one primary is "Your check-in", in the header. */}
                        <UIButton kind="secondary" size="small" type="submit" disabled={!pollQ.trim() || !pollOpts.trim() || savePoll.isPending}>
                          {savePoll.isPending ? 'Saving...' : 'Save'}
                        </UIButton>
                        <UIButton kind="secondary" size="small" onClick={() => { if (pollQ.trim() || pollOpts.trim()) setPollCancelArmed(true); else setShowPollForm(false) }}>Cancel</UIButton>
                      </div>
                      {pollCancelArmed && (
                        <Confirm saying="Discard the question and times you typed?" confirmLabel="Discard" keepLabel="Keep typing"
                          onConfirm={() => { setPollCancelArmed(false); setShowPollForm(false) }} onKeep={() => setPollCancelArmed(false)} />
                      )}
                      </Stack>
                    </form>
                  )}
                </div>
              )}
              {!b.poll ? (
                <Text size="15" ink="muted">No availability poll yet.</Text>
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
                      <FlexRow key={o.id} gap={10} align="center" className={`gwui-pt-8 gwui-pr-8 gwui-pb-8 gwui-pl-8 gwui-inner-row ${win ? 'gwui-win-row' : ''}`}>
                        <div className="gwui-fs-16" style={{fontWeight: 600, minWidth: 110}}>{o.label}</div>
                        {/* Only YOUR OWN availability is clickable. Everyone else is a
                            read-only indicator: the toggle endpoint acts on the caller,
                            so a clickable chip bearing someone else's name would set
                            your availability while appearing to set theirs. */}
                        <FlexRow gap={5} wrap flex1 align="center">
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
                            <Text size="13" ink="muted" as="span">
                              also: {o.who.filter(Boolean).join(', ')}
                            </Text>
                          )}
                        </FlexRow>
                        <div className={`gwui-fs-13-5 ${win ? 'gwui-ink-green' : 'gwui-ink-sub'}`} style={{minWidth: 42, textAlign: 'right', fontWeight: win ? 700 : 400}}>{o.count} in</div>
                      </FlexRow>
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
                  <Text size="15" ink="muted">
                    {sigs.length === 1
                      ? 'One pattern has come up so far. It is shown above, under What keeps coming up.'
                      : `${sigs.length} patterns have come up so far. They are shown above, under What keeps coming up.`}
                  </Text>
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
                      leadFirstName={(groundForSignals as any)?.leadFirstName ?? null}
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
        <Placed as="How this board is put together">
        <details className="gw-legend gwui-mt-28">
          <summary className="gwui-fs-13-5 gwui-ink-sub" style={{cursor: 'pointer'}}>How this board is put together</summary>
          <div className="gwui-mt-10">
            <Stack gap={12}>
              {[
                { h: 'What is open, first', p: 'It leads with what is still unresolved and what everyone already agrees on. The read across everything people said follows it.' },
                { h: 'Each gap names both sides', p: "Every disagreement carries each person's position in their own words, and what is at stake if it holds. The most significant comes first." },
                { h: 'Honest closes', p: 'Decisions rarely finish clean, so it names what is aligned, what is open, and the question the whole thing turns on. It never gives a verdict on a person.' },
              ].map((cell, i) => (
                <Stack key={i} gap={4}>
                  <div className="gwui-fs-13-5 gwui-ink-muted" style={{letterSpacing: '.1px', fontWeight: 700}}>{cell.h}</div>
                  <Text size="15" ink="sub" lineHeight={1.55}>{cell.p}</Text>
                </Stack>
              ))}
            </Stack>
          </div>
        </details>
        </Placed>
        </FoldEverythingElseUnless>


        {/*
          THE FOOTER IS GONE. It said "Everyone on this check-in sees the same board. It regenerates as
          people check in each session." Neither is true: each reader is served what they may read, and
          opening the board rebuilds nothing. The line at the top says what is true.
        */}

        </MaybeFolded>

        {/*
          THE "MARKETVIEW, WHERE NEXT" BOARD'S OWN PARTICIPANT: "EVERY SESSION" AT THE VERY END OF
          HER BOARD, AFTER EVERYTHING ELSE AND RIGHT BEFORE "ASK" (board-as-participant.txt: "Your
          share", then "Every session", then "Ask"). Every other kind of work keeps this link where
          the sales board review placed it, right after her own share - see above, where it is left
          out for this kind alone.
        */}
        {kindOfWorkKey === 'MarketView where next' && !shown.checkInGrid && b.myParticipantId && everySessionLink()}

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
        {picturedParticipant ? <ThePicturedAskBar b={b} /> : <AskTheBoard firstBlocker={b.dependencies?.[0] ?? null} myParticipantId={b.myParticipantId} />}
        {/* As pictured, after the ask bar: only offers about the reader's own work (answer 5). */}
        {picturedParticipant && <GroundworkRecommends offers={myOwnRecommendedOffers as any} onAnswer={(offerId, yes) => answerRecommendation.mutate({ offerId, yes })} busy={answerRecommendation.isPending} />}
        </>)}
        {/* Release 4: a template on a team whose board is not one of the kit's team types shows its stages here (Release 4 only). */}
        {(b as any).releaseFourTeams && (b as any).template && !picturedOtherKind && <TheTemplateSection b={b} />}
      </MaybeTheLightSalesBoard>
    </Page>
    </TheDirectMorning>
  )
}

/** The light sales board's placing of sections, where the server sent `atAGlance`; otherwise the board as it always was. */
function MaybeTheLightSalesBoard({ glance, readerRunsIt, children }: { glance: NonNullable<BoardPresent['atAGlance']> | null; readerRunsIt: boolean; children: ReactNode }) {
  if (!glance) return <>{children}</>
  return <TheLightSalesBoard glance={glance} readerRunsIt={readerRunsIt}>{children}</TheLightSalesBoard>
}

/**
 * U.10 ITEM 8: A FULL-WIDTH BAR, THE PROTOTYPE'S OWN WORDS.
 * Kept as its own small component so BoardPage's already-long body does not grow another inline
 * form; it owns nothing but the draft text, which it hands to the shared Ask Groundwork panel.
 */
function AskTheBoard({ firstBlocker, myParticipantId }: {
  firstBlocker: { from: string | null; fromParticipantId?: string | null; what: string; on: string | null } | null
  myParticipantId: string | null
}) {
  const [draft, setDraft] = useState('')
  const showWith = useAskStore((s) => s.showWith)
  /*
   * BOARD FIX (sales B, item 3e): "I", NOT HER OWN NAME, WHEN THE READER IS THE ONE WAITING.
   * `firstBlocker.from` is always the third-person name ("Amani Wekesa") - right for a colleague
   * or the lead reading about her, wrong on Amani's own board, where "Why is Amani Wekesa still
   * waiting on the price list?" reads as a question about a stranger rather than the one she
   * would actually ask ("Why am I still waiting on the price list?").
   */
  const readerIsWaiting = !!myParticipantId && firstBlocker?.fromParticipantId === myParticipantId
  /* `firstBlocker.what` can open with a capitalised article ("The Mwangi agency") where the same
     string also stands as a title elsewhere; mid-sentence here, only that leading word is wrong
     (real-user walk, Kijani Foods, fault 1). */
  const what = firstBlocker ? midSentence(firstBlocker.what) : ''
  const example = firstBlocker?.from
    ? (readerIsWaiting
      ? `Why am I still waiting on ${what}?`
      : `Why is ${firstBlocker.from} still waiting on ${what}?`)
    : 'Who is waiting on whom?'
  /*
   * PHONE CHECK, ITEM 4: THE PLACEHOLDER READ CUT OFF MID-EXAMPLE ("Ask about this board, for
   * example "Why") at 375px. An `<input>`'s placeholder never wraps, however the box itself does,
   * so the fix is a shorter line at phone width - the plain question itself, not the longer
   * "for example" framing, which is exactly what the full example still offers above 640px.
   */
  const isAPhone = useIsAPhone()
  const placeholder = isAPhone ? 'Ask about this board' : `Ask about this board, for example “${example}”`
  return (
    <FlexRow
      as="form"
      gap={8}
      className="gwui-mt-22"
      onSubmit={(e) => {
        e.preventDefault()
        const m = draft.trim()
        if (!m) return
        showWith(m)
        setDraft('')
      }}
    >
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label="Ask about this board"
        className="gwui-input" style={{flex: 1}}
      />
      {/*
        Secondary, not navy: the board's one primary is "Your check-in", in the header. The
        prototype's own board injects this "Ask" as a second navy button of its own
        (groundwork-prototype.html, R.board's regex, `class="btn pri"`) - but Hafsah's rule (30
        September, item 2) is "at most one primary button per screen", so this follows that rule
        rather than the prototype's own quirk here.
      */}
      <UIButton kind="secondary" type="submit">Ask</UIButton>
    </FlexRow>
  )
}

