import { useState } from 'react'
import {
  Section, Panel, FieldRows, FieldRow, SwitchRow, Choices, TextField, Select, FieldLabel,
  Button, Note, Callout,
} from '@/components/gw/ui'
import { WhosInItRoster } from '@/components/gw/WhosInItRoster'
import { RolesInThisCheckIn } from '@/components/gw/RolesInThisCheckIn'
import { statusSentence } from '@/components/gw/MyParticipation'
import { whatThisStatusMeans } from '@/components/gw/what-a-status-means-to-the-person-in-it'
import { BaselinePanel } from '@/components/gw/BaselinePanel'
import { StartingPointPanel } from '@/components/gw/StartingPointPanel'
import { WhichDaysTheyWork } from '@/components/gw/WhichDaysTheyWork'
import { AnchorDayPicker, DAY_NAMES, ordinal } from '@/components/gw/AnchorDayPicker'
import type { GroundCadence } from '@/api/grounds'
import { SELECTABLE_CADENCES, sessionsFor, cadenceLabel } from '@/lib/cadence'
import { scenarioLabel } from '@/lib/scenario-catalog'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * "PEOPLE AND SETUP" (the lead's check-in tab), rebuilt from `components/gw/ui`.
 *
 * docs/prototype/screens/A4-people-roles-and-access/check-in-people-and-setup.txt is the target:
 * Who's in it -> Roles in this check-in -> How it runs -> Who sees what -> When someone is blocked
 * -> Ending it -> Who else can see it. `GroundAdminPage.tsx` keeps every hook, query and mutation
 * (`tab === 'settings'`, moved here); this file only reads and writes through the props it is given.
 *
 * NOTHING FROM THE OLD TAB IS DROPPED. Every fold the old tab had that is not in the prototype here
 * is kept, placed next to the prototype section it is closest to, so it reads as an addition rather
 * than a hidden extra: "You in this check-in" (a lead's own sessions - `My work` already covers this
 * for a party, but nothing here duplicates it wrongly, so it stays until Hafsah says to drop it),
 * "What it is" (name and scenario), "What good looks like" (the yardstick and the starting point),
 * and "What has changed here" (the settings change log, folded under the sentence it belongs to).
 *
 * WHERE THE PROTOTYPE WOULD BE UNTRUE, THE PRODUCT'S OWN SENTENCE IS KEPT:
 * - "Ending it": no route closes a check-in. The heading stays; the body is the product's real
 *   "archiving is done by hand for now" plus the working "ask us to archive" mail link, and the
 *   real "delete it if it was only a test" control, which the prototype does not have and is not
 *   removed just because the prototype does not.
 * - "Who else can see it": no one-by-one access grant exists anywhere in the API. Left out rather
 *   than shown as a working control - see docs/requests-to-engine.md / the morning report.
 *
 * ACCESS ON SCREEN MATCHES THE SERVER, NOT THE OTHER WAY ROUND (checked against
 * api/src/modules/grounds/grounds.service.ts, 29 Sept): `canView` is the lead or an admin in this
 * organisation - the same gate `GroundAdminPage` already applies before this component ever mounts.
 * `canEdit` is per setting, read off the service method that actually enforces it:
 *   - lead only: reminders (`setChasing`), hiding email addresses (`setExternalVisibility`)
 *   - lead or an admin here: everything else that changes how this check-in runs - the timeframe,
 *     the name, who sees whom, targets, where people answer, and whether a blocker asks what was
 *     tried (`aSettingOnlyTheLeadMayChange` in the service covers all of these; `updateTimeline`
 *     and `setPeerVisibility`/`setPeopleWorkTogether` use the identical lead-or-admin check).
 * An admin who is not the lead sees every control an admin may use; a reader who is neither sees the
 * same information with no controls at all - the read-only view
 * (docs/prototype/screens/A4-people-roles-and-access/read-only-view.txt) shows this tab still on an
 * admin's own nav, with nothing to press.
 *
 * ONE PRIMARY BUTTON: "ADD PEOPLE" (Hafsah, 30 September), matching check-in-people-and-setup.jpg,
 * where "Add people" is the only navy button on the whole screen and every "Change" is a plain
 * link. The four "Save …" buttons this tab opens under a "Change" - name, start date, timeframe,
 * reminder days - are `kind="secondary"` for the same reason `SettingsPage.tsx` gives its own
 * "Save"-after-"Change" buttons secondary weight: a lead could have "Add people" and one of these
 * edit panels open at once, and two navy buttons on screen at the same time is exactly what this
 * rule forbids.
 */
/**
 * THE REMINDER SCHEDULE, AS ONE SENTENCE (U.4 review, item 8). Every day in `chaseAfterDays` is
 * counted from when the check-in opened, independently of the others (chasing-belongs-to-the-lead.ts,
 * `whatToDoToday`) - never "3 days, then 4 more, then 7 more". This says that plainly instead of
 * joining the days with "or", which read as a choice rather than a schedule.
 */
function chasingSentence(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b)
  const [first, ...rest] = sorted
  const day = (n: number) => `${n} day${n === 1 ? '' : 's'}`
  if (!rest.length) return `To anyone who has not answered, ${day(first)} after it opens.`
  const restText = rest.length === 1
    ? day(rest[0])
    : `${rest.slice(0, -1).map((d) => d).join(', ')} and ${rest[rest.length - 1]} days`
  return `To anyone who has not answered, ${day(first)} after it opens, then after ${restText}.`
}

/**
 * ONE CHANGE, AS ONE SENTENCE (U.4 re-review, item 5). This used to read "How long this runs: 4 to
 * 12 weeks. How often people check in: WEEKLY to FORTNIGHTLY. Changed by the party on 30 September." -
 * three pieces joined with colons, a raw setting name nobody chose to show a reader, and "the party",
 * which is work jargon the rest of this page never uses. `c.by` ("you", "lead" or "admin") never
 * names anyone (see the-audit-log-has-a-reader.spec.ts); this only turns it into the pronoun a
 * sentence needs.
 */
/**
 * "YOUR SESSIONS", AS ONE SENTENCE (U.4 re-review, item 6). Folded in from "You in this check-in",
 * this used to read "1 of 12 done" beside its own label, a number with no sentence around it. Reads
 * the way "Your status" beside it already does.
 */
/**
 * REQUEST 194: THE DAY CHECK-INS LAND ON, IN WORDS, BESIDE "HOW OFTEN". Empty for a cadence with no
 * day to land on (daily, one-time or as-you-decide), or when no day has been chosen.
 */
export function anchorDaySentence(cadence: GroundCadence, anchorDay: number | null | undefined): string {
  if (anchorDay == null) return ''
  if (cadence === 'WEEKLY' || cadence === 'FORTNIGHTLY') return ` Lands on ${DAY_NAMES[anchorDay]}s.`
  if (cadence === 'MONTHLY') return ` Lands on the ${ordinal(anchorDay)} of the month.`
  return ''
}

/**
 * HOW MANY OF THEIR OWN SESSIONS A PERSON HAS DONE (screens item c, 8 October). The set-up conversation is a check-in row with
 * `isSetup: true`; it is not a session, so it is never counted ("1 of 4 sessions are done" on day one). Distinct session numbers, so a
 * session answered and then corrected counts once.
 */
export function sessionsDoneBy(
  checkIns: { status?: string; isSetup?: boolean; participantId?: string; sessionNumber?: number | null }[],
  participants: { id: string; userId?: string | null }[],
  userId: string | null | undefined,
): number {
  return new Set(
    checkIns
      .filter((c) => c.status === 'COMPLETED' && !c.isSetup && participants.some((p) => p.id === c.participantId && p.userId === userId))
      .map((c) => c.sessionNumber ?? 0),
  ).size
}

export function yourSessionsSentence(done: number, planned: number | null): string {
  if (planned == null) return `${done} session${done === 1 ? '' : 's'} done so far.`
  /* B-012: "9 of 6 sessions are done" is not a possible count. However it is counted, how many are
     done can never be more than how many are planned. */
  const clamped = Math.min(done, planned)
  return `${clamped} of ${planned} session${planned === 1 ? ' is' : 's are'} done.`
}

export function settingsChangeSentence(c: { changedAt: string; by: 'you' | 'lead' | 'admin'; weeks: { from: number | null; to: number } | null; cadence: { from: GroundCadence | null; to: GroundCadence } | null }): string {
  const weeksText = (n: number) => `${n} week${n === 1 ? '' : 's'}`
  const parts: string[] = []
  if (c.weeks) {
    parts.push(`changed how long it runs from ${c.weeks.from != null ? weeksText(c.weeks.from) : 'not set'} to ${weeksText(c.weeks.to)}`)
  }
  if (c.cadence) {
    const from = c.cadence.from ? cadenceLabel(c.cadence.from).toLowerCase() : 'not set'
    const to = cadenceLabel(c.cadence.to).toLowerCase()
    parts.push(`changed how often people check in from ${from} to ${to}`)
  }
  const action = parts.length === 2 ? `${parts[0]} and ${parts[1]}` : (parts[0] ?? 'changed a setting')
  const onDate = whenItWas(c.changedAt, 'dayAndMonthLong')
  if (c.by === 'you') return `You ${action} on ${onDate}.`
  const who = c.by === 'lead' ? 'the person who runs it' : 'an admin'
  return `On ${onDate}, ${who} ${action}.`
}

/**
 * WALKTHROUGH PASS 2, ITEM 1: "INCLUDING YOUR MANAGER", SAID TO THE LEAD HERSELF.
 *
 * Hafsah's settled wording for who can see what you say (Conflict A, 29 September) is "The people
 * in this check-in, including your manager, can see what you say in it." - true for a participant,
 * who reads it on a check-in somebody else runs. But the lead reads this same sentence about her
 * own check-in: she is not being told about a manager of hers here, so the clause is dropped for
 * her.
 *
 * FAULT 5, 6 Oct 2026: AN ADMIN WHO IS NOT IN THE CHECK-IN IS NOT "YOU" EITHER. The comment above
 * used to say "a participant never reaches this admin page", which stopped being true once an
 * admin could read People and setup without being in the check-in herself (decision 5) - she saw
 * "...can see what YOU say in it" about a check-in she says nothing in. `viewerIsInIt` is the lead
 * or a participant; anybody else reads a third-person sentence that is true of her too.
 */
export function peersVisibilitySentence(args: {
  peersVisible: boolean
  peersVisibleToEachOther: boolean | null
  peersDefaultHidden: boolean
  isInitiator: boolean
  viewerIsInIt: boolean
}): string {
  const who = !args.viewerIsInIt
    ? 'The people in this check-in can see what each other say in it'
    : args.isInitiator
      ? 'The people in this check-in can see what you say in it'
      : 'The people in this check-in, including your manager, can see what you say in it'
  const named = args.viewerIsInIt ? 'You are named to each other.' : 'They are named to each other.'
  const notNamed = args.viewerIsInIt ? 'You are not named to each other.' : 'They are not named to each other.'
  if (args.peersVisible) return `${who}, once the team's report is shared. ${named}`
  if (args.peersVisibleToEachOther == null) {
    return `Not set, so this check-in uses the default for its kind: ${args.peersDefaultHidden ? 'hidden' : 'shown'}. ${who}, once the team's report is shared. ${args.peersDefaultHidden ? notNamed : named}`
  }
  return `${who}, once the team's report is shared. ${notNamed}`
}

export function CheckInPeopleAndSetup(props: {
  ground: any
  user: any
  id: string
  navigate: (to: string) => void
  isInitiator: boolean
  isOrgAdmin: boolean
  viewerIsAParty: boolean
  mySessionsDone: number
  plannedSessions: number | null
  colleagues?: { id: string; name: string; role?: string; team?: string | null }[]
  addingMany: boolean
  addManyParticipants: (picked: { id: string; name: string }[]) => void
  newParticipantEmail: string; setNewParticipantEmail: (v: string) => void
  newParticipantNote: string; setNewParticipantNote: (v: string) => void
  newParticipantDepartment: string; setNewParticipantDepartment: (v: string) => void
  addParticipantMut: { mutate: () => void; isPending: boolean }
  queuedToAdd: { email: string; note: string }[]; setQueuedToAdd: (q: { email: string; note: string }[]) => void
  inviteTheQueue: { mutate: () => void; isPending: boolean }
  lastInvitedEmail: string | null
  whyItWaits: string | null
  lastInviteWaits: boolean
  billingStatus: any
  onShareCode: () => void
  whoIsInThisParties?: { id: string; done: boolean; isSelf: boolean }[]
  whoIsInThisPeersHidden?: boolean
  whoIsInThisNotOpenYet?: boolean
  whoIsInThisLeadName?: string | null
  /** Set when a "give it more time"/"out of time" banner above the tabs sent the reader here. */
  forceOpenTimeframe?: boolean
  fixingEmailId: string | null; setFixingEmailId: (id: string | null) => void
  fixingEmailValue: string; setFixingEmailValue: (v: string) => void
  fixEmail: { mutate: (v: { participantId: string; email: string }) => void; isPending: boolean }
  resendInvite: { mutate: (id: string) => void; isPending: boolean; variables?: string }
  updateRole: { mutate: (v: { participantId: string; role: string }) => void; isPending: boolean }
  settingsChangeCount: number
  startsAtDraft: string; setStartsAtDraft: (v: string) => void
  startsAtOnRecord: string
  /** The check-in's created date: the server measures the timeline from startsAt, else createdAt, never "today" (when-the-clock-starts.ts). */
  createdAtOnRecord?: string | null
  canOfferStartDate: boolean
  timelineDaysDraft: number; setTimelineDaysDraft: (n: number) => void
  cadenceDraft: GroundCadence; setCadenceDraft: (c: GroundCadence) => void
  workingDaysDraft: number[]; setWorkingDaysDraft: (d: number[]) => void
  /** Request 194: the day check-ins land on. 0-6 (Sunday-Saturday) for a weekly or fortnightly
      rhythm, 1-31 for a monthly one, `null` for none set. */
  anchorDayDraft: number | null; setAnchorDayDraft: (d: number | null) => void
  theTimeframeChanged: boolean
  saveSetup: { mutate: (v: any) => void; isPending: boolean }
  groundLabel: string; setGroundLabel: (v: string) => void
  groundScenario: string; setGroundScenario: (v: string) => void
  peersVisible: boolean; peersDefaultHidden: boolean; setPeerVisibility: { mutate: (v: boolean) => void; isPending: boolean }
  contactHidden: boolean; setContactVisibility: { mutate: (v: boolean) => void; isPending: boolean }
  numbersShared: boolean; setWhoSeesTargets: { mutate: (v: boolean) => void; isPending: boolean }
  whatsAppIsOn: boolean
  setOverWhatsApp: { mutate: (v: boolean | null) => void; isPending: boolean }
  setSimplerWords: { mutate: (v: boolean) => void; isPending: boolean }
  expectsUnblocking: boolean; setExpectThemToUnblock: { mutate: (v: boolean) => void; isPending: boolean }
  setWorkTogether: { mutate: (v: boolean) => void; isPending: boolean }
  setChasing: { mutate: (v: { days?: number[]; stopped?: boolean; tellTheLead?: boolean }) => void; isPending: boolean }
  confirmDelete: boolean; setConfirmDelete: (v: boolean) => void
  deleteError: string | null; setDeleteError: (v: string | null) => void
  removeGround: { mutate: () => void; isPending: boolean }
}) {
  const {
    ground, user, navigate, isInitiator, isOrgAdmin, viewerIsAParty, mySessionsDone, plannedSessions,
  } = props
  /*
   * B-080: A LEAD WHO ONLY MANAGES NEVER CHECKS IN, SO SHE IS NOT GIVEN A SESSION COUNT OF HER OWN.
   * Grace runs "Shops reorder in two days" and does not check in; `sessionsDoneBy` already leaves
   * her set-up row out of the count (it is never a session), which left her reading "0 of 4
   * sessions are done." for the whole month and a note that appears "once you finish your first
   * check-in" she will never have. She reads what she actually does instead, in the prototype's
   * own voice.
   */
  const viewerParticipant = (ground?.participants ?? []).find((p: any) => p.userId === user?.id)
  const viewerManagingOnly = !!viewerParticipant?.managingOnly
  /**
   * FAULT 5: GATED ON WHAT THE SERVER SAYS, NOT ON ROLE.
   *
   * This used to be `isInitiator || isOrgAdmin`, so any org admin saw "Change" on Name, How
   * often, Use simpler words and the other setup fields - and pressing it opened the field -
   * even though the 1 October decision gives setup changes to the lead alone, and the server
   * already refuses an admin's write. Naomi, an admin reading Tendai's check-in, saw and could
   * open every one of these.
   *
   * `mayChangeSetup` (request 104, `GET /grounds/:id`) is the server's own answer to exactly this
   * question - `ContextPage.tsx`'s `mayRewriteTheBrief` already reads it the same way. The
   * `isInitiator || isOrgAdmin` fallback stays only for a payload that has not sent the field yet
   * (older fixtures, mid-rollout), never as a second opinion once the server has spoken.
   */
  const canEditRunOrAdmin = typeof (ground as any)?.mayChangeSetup === 'boolean'
    ? (ground as any).mayChangeSetup === true
    : (isInitiator || isOrgAdmin) // aSettingOnlyTheLeadMayChange / updateTimeline / peer-visibility / people-work-together
  const canEditLeadOnly = isInitiator // setExternalVisibility / setChasing
  /* FAULT 5: who "The people in this check-in ... say in it" is about - the lead or a participant,
     never an admin merely reading. See `peersVisibilitySentence`. */
  const viewerIsInIt = isInitiator || viewerIsAParty

  const [editingWhen, setEditingWhen] = useState(!!props.forceOpenTimeframe)
  const [editingReminders, setEditingReminders] = useState(false)
  const [editingWhere, setEditingWhere] = useState(false)
  const [editingSimplerWords, setEditingSimplerWords] = useState(false)
  const [remindDaysText, setRemindDaysText] = useState(((ground as any)?.chaseAfterDays ?? [1]).join(', '))
  const [showAddPeople, setShowAddPeople] = useState(false)
  const [showInviteLink, setShowInviteLink] = useState(false)
  const [editingName, setEditingName] = useState(false)

  return (
    <div className="gwui-page-wrap">
      <Section
        heading="Who's in it"
        action={(
          <>
            {isInitiator && ground.joinToken && (
              <Button kind="secondary" size="small" onClick={() => setShowInviteLink((v) => !v)}>Copy an invite link</Button>
            )}
            {isInitiator && <Button size="small" onClick={() => setShowAddPeople((v) => !v)}>Add people</Button>}
          </>
        )}
      >
        <WhosInItRoster
          ground={ground}
          isInitiator={isInitiator}
          isOrgAdmin={isOrgAdmin}
          colleagues={props.colleagues}
          addingMany={props.addingMany}
          addManyParticipants={props.addManyParticipants}
          newParticipantEmail={props.newParticipantEmail} setNewParticipantEmail={props.setNewParticipantEmail}
          newParticipantNote={props.newParticipantNote} setNewParticipantNote={props.setNewParticipantNote}
          newParticipantDepartment={props.newParticipantDepartment} setNewParticipantDepartment={props.setNewParticipantDepartment}
          addParticipantMut={props.addParticipantMut}
          queuedToAdd={props.queuedToAdd} setQueuedToAdd={props.setQueuedToAdd}
          inviteTheQueue={props.inviteTheQueue}
          lastInvitedEmail={props.lastInvitedEmail} whyItWaits={props.whyItWaits} lastInviteWaits={props.lastInviteWaits}
          billingStatus={props.billingStatus}
          navigate={navigate}
          onShareCode={props.onShareCode}
          fixingEmailId={props.fixingEmailId} setFixingEmailId={props.setFixingEmailId}
          fixingEmailValue={props.fixingEmailValue} setFixingEmailValue={props.setFixingEmailValue}
          fixEmail={props.fixEmail}
          resendInvite={props.resendInvite}
          showAdd={showAddPeople}
          showLink={showInviteLink}
          sessionParties={props.whoIsInThisParties}
          peersHidden={props.whoIsInThisPeersHidden}
          notOpenYet={props.whoIsInThisNotOpenYet}
          viewerIsParty={viewerIsAParty}
          leadName={props.whoIsInThisLeadName}
          viewerIsTheLead={isInitiator}
        />
      </Section>

      <Section heading="Roles in this check-in" note="Who runs it, who checks in, and each person's role as described">
        <RolesInThisCheckIn ground={ground} isInitiator={isInitiator} updateRole={props.updateRole} />
      </Section>

      {/* NOT IN THE PROTOTYPE HERE - kept as its own section; list for Hafsah.
          "YOU IN THIS CHECK-IN" IS FOLDED IN HERE, NOT A SECTION OF ITS OWN (U.4 review, item 11).
          It used to repeat "What it is" (Check-in, Situation) and "How it runs" (Sessions completed)
          as a second, separate copy of the same label pieces. `viewerIsAParty` is only ever true for
          the lead on this tab (an admin who is not also a participant never is), so what it said that
          nothing else here says - your role as described, and your own status - moves into the
          section it is closest to instead. */}
      <Section heading="What it is">
        <FieldRows>
          <FieldRow
            label="Name"
            value={ground.label}
            action={canEditRunOrAdmin ? <Button kind="quiet" size="small" onClick={() => setEditingName((v) => !v)}>Change</Button> : undefined}
          />
          {/* NO "CHANGE" HERE (U.4 review, item 10). The update route takes no `scenario` field, so
              pressing Change and saving used to say "Updated" and change nothing. Shown as a plain
              row until the server can take it - see docs/requests-to-engine.md. */}
          <FieldRow
            label="Situation"
            value={ground.scenario ? scenarioLabel(ground.scenario, ground.brief) : ''}
          />
          {viewerIsAParty && (() => {
            const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)
            return myParticipant?.roleAsDescribed
              ? <FieldRow label="Your role" value={myParticipant.roleAsDescribed} />
              : null
          })()}
        </FieldRows>

        {editingName && canEditRunOrAdmin && (
          <Panel>
            <FieldLabel htmlFor="ground-name">Name</FieldLabel>
            <TextField id="ground-name" value={props.groundLabel} onChange={(e) => props.setGroundLabel(e.target.value)} />
            <Button
              kind="secondary"
              size="small"
              disabled={!props.groundLabel.trim() || props.groundLabel === ground.label}
              onClick={() => props.saveSetup.mutate({ label: props.groundLabel.trim() })}
            >
              Save name
            </Button>
          </Panel>
        )}
      </Section>

      <div id="how-long-this-runs" />
      <Section heading="How it runs">
        <FieldRows>
          <FieldRow
            label="How often"
            value={`${cadenceLabel(ground.cadence)}. ${sessionsFor(ground.timelineDays, ground.cadence) ?? '?'} session${(sessionsFor(ground.timelineDays, ground.cadence) ?? 0) === 1 ? '' : 's'} in total.${anchorDaySentence(ground.cadence, (ground as any).cadenceAnchorDay)}`}
            action={canEditRunOrAdmin ? <Button kind="quiet" size="small" onClick={() => setEditingWhen((v) => !v)}>Change</Button> : undefined}
          />
          <FieldRow
            label="How long"
            value={(() => {
              /* THE REAL START, NOT ONLY WHAT WAS TYPED. `ground.startsAt` is set only when a lead
                 chose a future date; otherwise the check-in's clock started when it was created -
                 the same fallback the server itself uses (when-the-clock-starts.ts, clockStartsAt).
                 Session 1 having already happened is proof the clock started even where `startsAt`
                 was never set. */
              const start = (ground as any).startsAt ?? ground.createdAt
              if (!start) return `Runs for ${ground.timelineDays ?? '?'} days once it starts.`
              const startText = whenItWas(start, 'dayAndMonthLong')
              const end = (ground as any).endsOn
              if (!end) return `Started ${startText}. Runs for ${ground.timelineDays ?? '?'} days.`
              const daysLeft = (ground as any).daysLeft
              const left = daysLeft != null ? ` ${daysLeft} day${daysLeft === 1 ? '' : 's'} left.` : ''
              return `${startText} to ${whenItWas(end, 'dayAndMonthLong')}.${left}`
            })()}
            /*
             * B-018: THE PROTOTYPE'S OWN "GIVE IT MORE TIME" BUTTON (check-in-people-and-setup.txt:
             * "How long … Give it more time"), MISSING HERE. The only way in was the warning that
             * appears in the last week of a check-in - so extending it early, before that warning
             * ever shows, had no button anywhere. Opens the same timeframe editor "How often"'s own
             * "Change" button does (it holds the "Ends on" field this actually extends).
             */
            action={canEditRunOrAdmin ? <Button kind="quiet" size="small" onClick={() => setEditingWhen(true)}>Give it more time</Button> : undefined}
          />
          {props.whatsAppIsOn && (ground as any)?.orgHasWhatsApp && (
            <FieldRow
              label="Where people answer"
              value={(ground as any).overWhatsApp === true ? 'On WhatsApp' : (ground as any).overWhatsApp === false ? 'In Groundwork' : 'Whatever this organisation does'}
              action={canEditRunOrAdmin ? <Button kind="quiet" size="small" onClick={() => setEditingWhere((v) => !v)}>Change</Button> : undefined}
            />
          )}
          {/*
           * "USE SIMPLER WORDS" (6 October answer). Read and changed only by the lead of this
           * check-in, or an admin in this organisation - the same reach as every other row here,
           * since a plain participant never opens this page at all (GroundPage.tsx sends them to
           * GroundParticipantPage instead). Gated again here, defensively, so the row cannot appear
           * if that ever changes.
           */}
          {canEditRunOrAdmin && (
            <FieldRow
              label="Use simpler words"
              value={(ground as any).simplerWords ? 'On' : 'Off'}
              action={<Button kind="quiet" size="small" onClick={() => setEditingSimplerWords((v) => !v)}>Change</Button>}
            />
          )}
          <FieldRow
            label="Reminders"
            value={(ground as any)?.chasingStopped
              ? 'Off. Nobody is reminded.'
              : chasingSentence(((ground as any)?.chaseAfterDays ?? [1]) as number[])}
            action={canEditLeadOnly ? <Button kind="quiet" size="small" onClick={() => setEditingReminders((v) => !v)}>Change</Button> : undefined}
          />
          {/* Folded in from "You in this check-in" (item 11): your own status and progress here. */}
          {viewerIsAParty && (
            <>
              <FieldRow label="Your status" value={statusSentence(whatThisStatusMeans(ground.status))} />
              <FieldRow
                label="Your sessions"
                value={viewerManagingOnly ? 'You run this check-in and do not check in yourself.' : yourSessionsSentence(mySessionsDone, plannedSessions)}
              />
            </>
          )}
        </FieldRows>

        {editingWhen && canEditRunOrAdmin && (
          <Panel>
            {props.canOfferStartDate && (
              <>
                <FieldLabel htmlFor="starts-at">When it starts</FieldLabel>
                <TextField id="starts-at" type="date" value={props.startsAtDraft} onChange={(e) => props.setStartsAtDraft(e.target.value)} />
                <Note>
                  Session 1 opens on this day, and anybody you add before it is invited on it. Leave it
                  empty to open the check-in as soon as people are added.
                </Note>
                <Button
                  kind="secondary"
                  size="small"
                  disabled={props.startsAtDraft === props.startsAtOnRecord || props.saveSetup.isPending}
                  onClick={() => props.saveSetup.mutate({ startsAt: props.startsAtDraft || undefined })}
                >
                  Save start date
                </Button>
              </>
            )}
            <FieldLabel htmlFor="ends-on">Ends on</FieldLabel>
            <TextField
              id="ends-on"
              type="date"
              value={(() => {
                const from = props.startsAtOnRecord ? new Date(props.startsAtOnRecord) : props.createdAtOnRecord ? new Date(props.createdAtOnRecord) : new Date()
                const end = new Date(from.getTime() + props.timelineDaysDraft * 86_400_000)
                return Number.isFinite(end.getTime()) ? end.toISOString().slice(0, 10) : ''
              })()}
              onChange={(e) => {
                const from = props.startsAtOnRecord ? new Date(props.startsAtOnRecord) : props.createdAtOnRecord ? new Date(props.createdAtOnRecord) : new Date()
                const days = Math.round((new Date(e.target.value).getTime() - from.getTime()) / 86_400_000)
                if (Number.isFinite(days) && days >= 1) props.setTimelineDaysDraft(days)
              }}
            />
            <Select
              value={props.cadenceDraft}
              onChange={(e) => {
                const c = e.target.value as GroundCadence
                props.setCadenceDraft(c)
                /* A day picked for one rhythm means something different, or nothing, in another -
                   the same rule TheSetup.tsx's own picker follows (request 194). */
                if (c !== props.cadenceDraft) props.setAnchorDayDraft(null)
              }}
              aria-label="Session cadence"
            >
              {SELECTABLE_CADENCES.map((c) => <option key={c.cadence} value={c.cadence}>{c.label}</option>)}
            </Select>
            {/*
              REQUEST 194 (8 October 2026): THE SAME DAY PICKER SETUP ALREADY OFFERS, NOW HERE TOO,
              so a lead can change the day check-ins land on after the check-in has started, not only
              while it is being created. Applies from the next session that is made; a session
              already made keeps its date (docs/answers-from-engine.md, "Request 194, answered").
            */}
            {(props.cadenceDraft === 'WEEKLY' || props.cadenceDraft === 'FORTNIGHTLY' || props.cadenceDraft === 'MONTHLY') && (
              <AnchorDayPicker cadence={props.cadenceDraft} anchorDay={props.anchorDayDraft} onAnchorDay={props.setAnchorDayDraft} idPrefix="people-and-setup" />
            )}
            {props.cadenceDraft !== 'ONE_TIME' && (
              <WhichDaysTheyWork value={props.workingDaysDraft} onChange={props.setWorkingDaysDraft} />
            )}
            <Note>
              {props.timelineDaysDraft} days, {sessionsFor(props.timelineDaysDraft, props.cadenceDraft) ?? 1} session{(sessionsFor(props.timelineDaysDraft, props.cadenceDraft) ?? 1) === 1 ? '' : 's'}.
              {' '}Sessions already completed are never removed. On the last one, everybody is asked
              how this should close, and it ends on the answer you agree.
              {/* Request 194, answered: a session already made keeps its own date. */}
              {(props.cadenceDraft === 'WEEKLY' || props.cadenceDraft === 'FORTNIGHTLY' || props.cadenceDraft === 'MONTHLY') && (
                <> The day you choose applies from the next check-in on. A session already made keeps its own date.</>
              )}
            </Note>
            <Button
              kind="secondary"
              size="small"
              disabled={!props.theTimeframeChanged || props.saveSetup.isPending}
              onClick={() => props.saveSetup.mutate({ timelineDays: props.timelineDaysDraft, cadence: props.cadenceDraft, workingDays: props.workingDaysDraft, cadenceAnchorDay: props.anchorDayDraft })}
            >
              Save timeframe
            </Button>
          </Panel>
        )}

        {editingWhere && canEditRunOrAdmin && props.whatsAppIsOn && (ground as any)?.orgHasWhatsApp && (
          <Panel>
            <Choices
              label="Where people answer this"
              value={(ground as any).overWhatsApp === true ? 'on' : (ground as any).overWhatsApp === false ? 'in' : 'whatever'}
              onChange={(key) => props.setOverWhatsApp.mutate(key === 'on' ? true : key === 'in' ? false : null)}
              stacked
              options={[
                { key: 'whatever', label: 'Whatever this organisation does', description: 'The default. People who have a number on their profile get it on WhatsApp; everybody else answers here.' },
                { key: 'on', label: 'On WhatsApp', description: 'The check-in, the reminders and the report go to their phone. They reply to the message and that reply is their answer.' },
                { key: 'in', label: 'In Groundwork', description: 'This one stays here even though your organisation has a number. For a conversation you would rather was not on somebody’s phone.' },
              ]}
            />
          </Panel>
        )}

        {editingSimplerWords && canEditRunOrAdmin && (
          <Panel>
            <SwitchRow
              title="Use simpler words"
              detail="Everybody in this check-in is spoken to in short sentences and everyday words, and what is sent to them afterwards is written the same way."
              on={!!(ground as any).simplerWords}
              onChange={(on) => props.setSimplerWords.mutate(on)}
              disabled={props.setSimplerWords.isPending}
            />
          </Panel>
        )}

        {editingReminders && canEditLeadOnly && (
          <Panel>
            <SwitchRow
              title="Remind people who have not answered"
              detail="Never more than one a day."
              on={!(ground as any)?.chasingStopped}
              onChange={(on) => props.setChasing.mutate({ stopped: !on })}
              disabled={props.setChasing.isPending}
            />
            <FieldLabel htmlFor="chase-days">Remind after how many days of no answer</FieldLabel>
            <TextField
              id="chase-days"
              value={remindDaysText}
              onChange={(e) => setRemindDaysText(e.target.value)}
              placeholder="1"
            />
            <Button
              kind="secondary"
              size="small"
              disabled={props.setChasing.isPending}
              onClick={() => {
                const days = remindDaysText.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 365)
                if (days.length) props.setChasing.mutate({ days })
              }}
            >
              Save reminder days
            </Button>
            <SwitchRow
              title="Tell me who never started"
              detail="A separate note to you when somebody has not opened it at all."
              on={!!(ground as any)?.tellTheLead}
              onChange={(on) => props.setChasing.mutate({ tellTheLead: on })}
              disabled={props.setChasing.isPending}
            />
          </Panel>
        )}
      </Section>

      {/* NOT IN THE PROTOTYPE HERE - kept, one section each (each already carries its own single
          heading - "What doing well looks like", "Where this stood at the start" - so this does not
          wrap them in a second, redundant heading). List for Hafsah. */}
      <BaselinePanel groundId={props.id} canState={isInitiator} />
      <StartingPointPanel groundId={props.id} canRecord={isInitiator} />

      <Section heading="Who sees what">
        <FieldRows>
        <SwitchRow
          title="Each other's check-ins"
          /*
           * GROUP 3'S REVIEW, BATCH A FAULT 2: "NOBODY SEES ANOTHER PERSON'S ANSWERS" IS NOT TRUE.
           *
           * The team's report, which everyone in the check-in reads once it is shared, can quote a
           * person's own words under their name - `peersVisibleToEachOther` decides whether that
           * naming happens, not whether the content does (see `who-may-read-this-check-in.ts` and
           * `peersAreNamedOn`: a participant always reads the shared report, either with names or
           * with "a colleague" in their place). So the old sentence told the reader the opposite of
           * what the switch actually controls. Hafsah's settled wording for this fact (Conflict A,
           * 29 September) is "The people in this check-in, including your manager, can see what you
           * say in it." - carried here, with the one thing this switch truly decides (whether that
           * is said with names or without) added after it.
           *
           * WALKTHROUGH PASS 2, ITEM 1: SAID TO THE LEAD, "INCLUDING YOUR MANAGER" NAMES HER OWN
           * MANAGER, NOT HERSELF - but this page is also where the lead reads it, about her own
           * check-in, and she is not told about a manager of hers here. To the lead, the clause is
           * dropped; a participant (who does not reach this admin page) keeps the prototype's words
           * unchanged.
           */
          detail={peersVisibilitySentence({
            peersVisible: props.peersVisible,
            peersVisibleToEachOther: (ground as any)?.peersVisibleToEachOther ?? null,
            peersDefaultHidden: props.peersDefaultHidden,
            isInitiator,
            viewerIsInIt,
          })}
          on={props.peersVisible}
          onChange={(on) => props.setPeerVisibility.mutate(on)}
          disabled={!canEditRunOrAdmin || props.setPeerVisibility.isPending}
        />
        <SwitchRow
          title="Hide email addresses from each other"
          detail={props.contactHidden
            ? "The people in this check-in can’t see each other’s email addresses."
            : "The people in this check-in can see each other’s email addresses, so they can contact each other directly."}
          on={props.contactHidden}
          onChange={(on) => props.setContactVisibility.mutate(on)}
          disabled={!canEditLeadOnly || props.setContactVisibility.isPending}
        />
        <SwitchRow
          title="Targets"
          detail={props.numbersShared ? "Each person sees their own share and the team's total." : 'Each person sees only their own number. You see all of them.'}
          on={props.numbersShared}
          onChange={(on) => props.setWhoSeesTargets.mutate(on)}
          disabled={!canEditRunOrAdmin || props.setWhoSeesTargets.isPending}
        />
        {/* NOT IN THE PROTOTYPE; kept - it decides whether people here can confirm each other's work,
            which the board's fairness reads depend on. THE THIRD STATE (U.4 review, item 10): null
            means nobody has answered this, and the board falls back to what the kind of check-in
            usually means - the same three-state pattern "Each other's check-ins" already uses. */}
        <SwitchRow
          title="Who can confirm each other's work"
          detail={ground.peopleWorkTogether == null
            ? "Nobody has said yet whether these people see each other's work day to day, so it is assumed from the kind of check-in. If they do, they can confirm what each other says."
            : "People who see each other's work day to day can confirm what each other says. The board says so when they cannot, and does not read somebody being quiet as work going missing."}
          on={!!ground.peopleWorkTogether}
          onChange={(on) => props.setWorkTogether.mutate(on)}
          disabled={!canEditRunOrAdmin || props.setWorkTogether.isPending}
        />
        {/* THE TEAM'S REPORT SHARING IS NOT A SETTING HERE. Release happens from the report itself
            (Board/Context), so this row says the true, current state rather than offering a control
            this tab does not have.

            FAULT 4 (LIVE RE-WALK): "NOT SHARED YET... WHEN IT IS READY" READ AS IF IT WERE NOT
            READY, FOR A GROUND THAT WAS. This said so for every unreleased report, including a
            `REPORT_READY` one - while the header (GroundAdminPage.tsx's own `reportState`) read
            "The report is ready to read." about the very same ground. Distinguished now: once the
            report is actually ready, this says so, in the same words the header uses. */}
        <FieldRow
          label="The team's report"
          value={
            ground.report?.releasedAt
              ? `Shared on ${whenItWas(ground.report.releasedAt, 'dayAndMonthLong')}.`
              : ground.status === 'REPORT_READY'
                ? 'The report is ready. It has not been shared yet.'
                : 'Not shared yet. Share it from the report when it is ready.'
          }
        />
        </FieldRows>
        {props.settingsChangeCount > 0 && (
          <details className="gwui-folded">
            <summary className="gwui-folded-summary">
              <b>Changes to how long it runs and how often are noted with who made them and the date.</b>
              <span className="gwui-folded-note">{props.settingsChangeCount === 1 ? '1 change since setup' : `${props.settingsChangeCount} changes since setup`}</span>
            </summary>
            <div className="gwui-folded-body">
              {[...((ground as any).settingsChanges ?? [])].reverse().map((c: any, i: number) => (
                <Note key={i}>{settingsChangeSentence(c)}</Note>
              ))}
            </div>
          </details>
        )}
        {props.settingsChangeCount === 0 && (
          <Note>
            Changes to how long it runs and how often are noted with who made them and the date.
          </Note>
        )}
      </Section>

      <Section heading="When someone is blocked">
        <SwitchRow
          title="What we ask them"
          detail={props.expectsUnblocking
            ? `A blocker is recorded with what has already been done about it, and the person is offered ways through on their own report. ${isInitiator ? 'You see it too, as one thing to ask for.' : 'Their lead sees the same thing as one thing to ask for.'}`
            : 'What is in their way is recorded, and nothing is asked about what they tried. For people with no standing to chase anybody, or a check-in that is there to hear what happened.'}
          on={props.expectsUnblocking}
          onChange={(on) => props.setExpectThemToUnblock.mutate(on)}
          disabled={!canEditRunOrAdmin || props.setExpectThemToUnblock.isPending}
        />
      </Section>

      {/*
        FAULT 7, 6 Oct 2026: THIS STILL SAID "YOU CANNOT END A CHECK-IN YOURSELF YET" AFTER
        `/grounds/:id/end` (EndingPage.tsx) STARTED LETTING THE LEAD DO EXACTLY THAT - "Save the
        outcome and end it". The comment above this section was itself the old, now-stale reason:
        true when it was written (no route ended a check-in), false since the ending page shipped.
        `ResolutionPanel.tsx`'s own `canChoose` is the server's answer to who may actually decide
        there (`viewerIsLead || (!leadDecides && viewerIsParty)`); on this page, reached only by
        the lead or an admin, that is `isInitiator` alone - an admin reading here still only reads
        the ending page, same as the rest of this tab's "the lead decides setup" rule. She keeps
        the old sentence and the mail fallback; the lead is pointed at the page that now exists.
        A plain `<a href>`, not `Button to`, because `Button`'s `to` always renders a react-router
        `Link` - this page is also mounted outside a Router in its own tests - and `kind="secondary"`
        to stay within this page's one-primary-button budget (the-rebuilt-pages-use-only-the-new-
        parts.spec.ts), matching the "Ask us to end this check-in" button beside it.
      */}
      <Section heading="Ending it">
        <Callout>
          When it ends, nobody can add to it and everything stays as it is. Each person keeps their
          own history. This can't be undone.
        </Callout>
        {isInitiator ? (
          <>
            <Note>You can end this check-in when it has done its job.</Note>
            <a className="gwui-btn gwui-btn-secondary" href={`/grounds/${props.id}/end`}>Decide how it ends</a>
          </>
        ) : (
          <>
            <Note>
              You cannot end a check-in yourself yet. Ask us and we will end it for you, usually the same
              day.
              {isOrgAdmin && (props.whoIsInThisLeadName
                ? ` ${props.whoIsInThisLeadName} runs it, so ending it ends something they are running.`
                : ' Somebody else runs it, so ending it ends something they are running.')}
            </Note>
            <a
              className="gwui-btn gwui-btn-secondary gwui-btn-red-text"
              href={`mailto:hello@myground.work?subject=Archive check-in: ${encodeURIComponent(ground.label)}`}
            >
              Ask us to end this check-in
            </a>
          </>
        )}

        {isInitiator && (
          <Panel>
            <Note>
              If this was only a test, you can delete it. Everything goes, including the conversation,
              the sessions and anything uploaded. If somebody else has already answered, it cannot be
              deleted, because it is now a record. Ask us to end it instead.
            </Note>
            {props.deleteError && <Note tone="error">{props.deleteError}</Note>}
            {props.confirmDelete ? (
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                <span>Delete "{ground.label}" for good?</span>
                <Button kind="danger" disabled={props.removeGround.isPending} onClick={() => props.removeGround.mutate()}>
                  {props.removeGround.isPending ? 'Deleting…' : 'Yes, delete it'}
                </Button>
                <Button kind="secondary" onClick={() => { props.setConfirmDelete(false); props.setDeleteError(null) }}>Keep it</Button>
              </div>
            ) : (
              <Button kind="secondary" redText onClick={() => { props.setDeleteError(null); props.setConfirmDelete(true) }}>Delete this check-in</Button>
            )}
          </Panel>
        )}
      </Section>

      {/* "WHO ELSE CAN SEE IT": LEFT OUT. No one-by-one access grant exists anywhere in the API - see
          docs/requests-to-engine.md. Only admins and the people on the roster above can read this
          check-in's board and reports, which is the product's true, current state. */}
    </div>
  )
}
