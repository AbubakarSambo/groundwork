import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { toast } from 'sonner'
import { SwitchRow } from '@/components/gw/ui'
import { DAY_NAMES, ordinal } from '@/components/gw/AnchorDayPicker'
import type { GroundCadence } from '@/api/grounds'
import { cadenceLabel, timesAWeek } from '@/lib/cadence'
import { theRhythmInFull } from '@/lib/the-closing-after-your-first-check-in'
import { plannedSessionsFor } from '@/lib/sessionCount'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { whenTheCheckInsLand, type Cadence } from '@/components/gw/when-the-check-ins-land'
import { PeopleAndSetupAsPictured } from './PeopleAndSetupAsPictured'

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
export function chasingSentence(days: number[]): string {
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
export function anchorDaySentence(cadence: GroundCadence, anchorDay: number | null | undefined, cadenceDays: number[] | null | undefined): string {
  /* Twice or more a week, its days are already in the rhythm's own words (cadenceLabel), and one day is not where it lands. */
  if (anchorDay == null || timesAWeek(cadence, cadenceDays)) return ''
  if (cadence === 'WEEKLY' || cadence === 'FORTNIGHTLY') return ` Lands on ${DAY_NAMES[anchorDay]}s.`
  if (cadence === 'MONTHLY') return ` Lands on the ${ordinal(anchorDay)} of the month.`
  return ''
}

export function yourSessionsSentence(done: number, planned: number | null): string {
  if (planned == null) return `${done} check-in${done === 1 ? '' : 's'} done so far.`
  /* B-012: "9 of 6 sessions are done" is not a possible count. However it is counted, how many are
     done can never be more than how many are planned. */
  const clamped = Math.min(done, planned)
  return `${clamped} of ${planned} check-in${planned === 1 ? ' is' : 's are'} done.`
}

export function settingsChangeSentence(c: { changedAt: string; by: 'you' | 'lead' | 'admin'; weeks: { from: number | null; to: number } | null; cadence: { from: GroundCadence | null; to: GroundCadence } | null }): string {
  const weeksText = (n: number) => `${n} week${n === 1 ? '' : 's'}`
  const parts: string[] = []
  if (c.weeks) {
    parts.push(`changed how long it runs from ${c.weeks.from != null ? weeksText(c.weeks.from) : 'not set'} to ${weeksText(c.weeks.to)}`)
  }
  if (c.cadence) {
    const from = c.cadence.from ? cadenceLabel(c.cadence.from, null).toLowerCase() : 'not set'
    const to = cadenceLabel(c.cadence.to, null).toLowerCase()
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

export type PeopleAndSetupProps = {
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
  newParticipantName?: string
  setNewParticipantName?: (v: string) => void
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
}

/** People and setup is the B8 pictures' page (PeopleAndSetupAsPictured.tsx) for everybody. */
export function CheckInPeopleAndSetup(props: PeopleAndSetupProps) {
  return <PeopleAndSetupAsPictured {...props} />
}

/** The date "Ends on" shows: the start (or the day it was made) plus the length in days. */
export function theEndOnTheField(startsAtOnRecord: string | null | undefined, createdAtOnRecord: string | null | undefined, days: number): string {
  const from = startsAtOnRecord ? new Date(startsAtOnRecord) : createdAtOnRecord ? new Date(createdAtOnRecord) : new Date()
  const end = new Date(from.getTime() + days * 86_400_000)
  return Number.isFinite(end.getTime()) ? end.toISOString().slice(0, 10) : ''
}

/**
 * WHAT "SAVE TIMEFRAME" SENDS (journey test, 12 October 2026). The end date shown in "Ends on" goes too, so the server counts the
 * sessions up to it the way setup does and stores the end, rather than dividing calendar days by the rhythm's gap.
 */
export function theTimeframeToSave(p: { startsAtOnRecord?: string | null; createdAtOnRecord?: string | null; timelineDaysDraft: number; cadenceDraft: string; workingDaysDraft: number[]; anchorDayDraft: number | null }) {
  const endsOn = theEndOnTheField(p.startsAtOnRecord, p.createdAtOnRecord, p.timelineDaysDraft)
  return { timelineDays: p.timelineDaysDraft, cadence: p.cadenceDraft, workingDays: p.workingDaysDraft, cadenceAnchorDay: p.anchorDayDraft, ...(endsOn ? { endsOn } : {}) }
}

/** How many sessions open from the start (or the day it was made, "Now") up to the end on the field: setup's own count. */
export function sessionsUpToTheEnd(p: { startsAtOnRecord?: string | null; createdAtOnRecord?: string | null; timelineDaysDraft: number; cadenceDraft: string; workingDaysDraft: number[]; anchorDayDraft: number | null }): number | null {
  if (!['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'].includes(p.cadenceDraft)) return null
  const endsOn = theEndOnTheField(p.startsAtOnRecord, p.createdAtOnRecord, p.timelineDaysDraft)
  if (!endsOn) return null
  const startsAt = p.startsAtOnRecord ? new Date(p.startsAtOnRecord) : null
  const today = p.createdAtOnRecord ? new Date(p.createdAtOnRecord) : new Date()
  const all = whenTheCheckInsLand({ cadence: p.cadenceDraft as Cadence, anchorDay: p.anchorDayDraft, startsAt, workingDays: p.workingDaysDraft, today, howMany: 2000 })
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return Math.max(1, all.filter((d) => iso(d) <= endsOn).length)
}

/** "Every day, until you end it." for a check-in with no end; otherwise how often and how many sessions, as before. */
export function theRhythmLine(ground: { cadence?: any; timelineDays?: number | null; runsUntilItIsEnded?: boolean; cadenceAnchorDay?: number | null } & Record<string, any>): string {
  const anchor = anchorDaySentence(ground.cadence, (ground as any).cadenceAnchorDay, (ground as any).cadenceDays)
  /* The one count, with the days (lib/sessionCount.ts), as the server's totalSessionsFor counts. */
  const n = plannedSessionsFor(ground.timelineDays, ground.cadence, null, (ground as any).cadenceDays)
  /* How often, in the one wording every page uses (theRhythmInFull, staging check S18). */
  const often = theRhythmInFull(ground as any, { stop: false }) ?? cadenceLabel(ground.cadence, (ground as any).cadenceDays)
  if ((ground as any).runsUntilItIsEnded || n == null) return `${often}, until you end it.${anchor}`
  return `${often}. ${n} check-in${n === 1 ? '' : 's'} in total.${anchor}`
}

export function TheReportSharesItself({ ground, canChange }: { ground: any; canChange: boolean }) {
  const qc = useQueryClient()
  const at: string | null = ground?.reportSharesAt ?? null
  const setIt = useMutation({
    mutationFn: (time: string | null) => groundsApi.setReportSharesAt(ground.id, time),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ground', ground.id] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change. The report is still shared the same way. Try again in a moment.'),
  })
  const clock = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h >= 12 ? 'pm' : 'am'}`
  }
  return (
    <SwitchRow
      title="Share the team's report by itself"
      detail={at
        ? `The team's report shares itself at ${clock(at)} in your organisation's day, unless you choose "Hold it" first.`
        : 'Off. The team’s report is shared once everyone has checked in, or when you share it.'}
      on={!!at}
      onChange={(on) => setIt.mutate(on ? '18:30' : null)}
      disabled={!canChange || setIt.isPending}
    />
  )
}
