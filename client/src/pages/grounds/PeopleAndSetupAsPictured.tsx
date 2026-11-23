import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi, type GroundCadence, type PeopleAndSetup, type ASetupProblem } from '@/api/grounds'
import { conversationApi } from '@/api/conversation'
import { participantRequestsApi, type ParticipantRequest } from '@/api/participantRequests'
import {
  Section, Panel, FieldRows, FieldRow, SwitchRow, FieldLabel, TextField, Select, Button, Note, Stack, FlexRow, Text, Folded, SmallMenu,
} from '@/components/gw/ui'
import { AddPeopleForm, whereThisPersonIs, whosInItSays } from '@/components/gw/WhosInItRoster'
import { useTheNextSeat } from '@/components/gw/this-adds-a-seat'
import { TheStartingPoint } from '@/components/gw/StartingPointPanel'
import { WhichDaysTheyWork, WEEKDAYS } from '@/components/gw/WhichDaysTheyWork'
import { AnchorDayPicker } from '@/components/gw/AnchorDayPicker'
import { workingDaysOf } from '@/components/gw/when-the-check-ins-land'
import { SoloReportBody } from '@/components/gw/SoloReportBody'
import { copy } from '@/components/gw/copying-can-fail'
import { theLeadsNote } from '@/lib/the-leads-note'
import { scenarioLabel } from '@/lib/scenario-catalog'
import { scrollToId } from '@/lib/scroll-to'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { numberUpToTenInWords } from '@/lib/a-number-up-to-ten-in-words'
import { sessionsFor, SELECTABLE_CADENCES, cadenceLabel } from '@/lib/cadence'
import { theRhythmInFull } from '@/lib/the-closing-after-your-first-check-in'
import { KIND_OF_WORK_OPTION_LABEL } from '@/pages/board/WorkRecords'
import { SHARE_A_LINK } from './ShareSection'
import {
  type PeopleAndSetupProps, chasingSentence, settingsChangeSentence, theEndOnTheField, theTimeframeToSave, sessionsUpToTheEnd,
  anchorDaySentence, yourSessionsSentence,
} from './CheckInPeopleAndSetup'
import '@/pages/board/pictured/pictured-board.css'
import { Paged } from '@/components/gw/ui/Paged'

/**
 * PEOPLE AND SETUP, AS THE PROTOTYPE DRAWS IT (docs/prototype/screens/A4-people-roles-and-access/check-in-people-and-setup.txt;
 * the page audit of 24 November 2026, rows 2 and 8, approved by Hafsah).
 *
 * ONE LIST OF PEOPLE. "Who's in it" is the check-in's one roster: each person is one row with their name, their address, when they
 * joined, one status, their phone number (always shown, always editable), their check-in dots and "Copy check-in link", and "···"
 * for everything else (their role here, what is on record for them with "Change this in the chat", a reminder, the invitation, the
 * report they shared). "Who has answered" (`?tab=sessions`) was a second copy of the same fourteen people; it lands here now.
 *
 * ONE LINE PER SETTING. Every setting is a summary line with "Change", and "Change" opens that one setting's editor, so nothing that
 * could be changed before is lost and nothing is drawn as an open form until it is asked for. The server still decides who may change
 * what: a setting the reader may not change is its line with no "Change".
 *
 * NOTHING APPLIES UNTIL IT IS SAVED. Every change waits in this page until "Save changes", and is then written through the route that
 * already writes it. Opening the page writes nothing. The lead or an admin reads the whole page; a team member never reaches it
 * (YourPeopleAndSetup.tsx). One navy button, "Add people".
 */
type Served = Extract<PeopleAndSetup, { view: 'lead' | 'admin' }>

/* Every rhythm a lead may choose, from the one list (lib/cadence.ts), so this picker can never drop one the product recommends.
   A daily check-in is offered twice, as the prototype pictures it: on weekdays only, or every day. */
const HOW_OFTEN: { key: string; label: string }[] = SELECTABLE_CADENCES.map((c) => ({ key: c.cadence as string, label: c.label }))
  .flatMap((c) => (c.key === 'DAILY' ? [{ key: 'weekday', label: 'Every weekday' }, { key: 'day', label: c.label }] : [c]))

const weekdaysOnly = (days: number[]) => { const d = workingDaysOf(days); return d.length === 5 && WEEKDAYS.every((x) => d.includes(x)) }
export function howOftenKey(cadence: string, workingDays: number[]): string {
  if (cadence === 'DAILY') return weekdaysOnly(workingDays) ? 'weekday' : 'day'
  return cadence
}

/** "+254 7·· ··· 112": the number as the pictures show it, the last three figures only. */
export function aNumberAsShown(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.length < 7) return phone
  return `${digits.slice(0, 4)} ${digits.charAt(4)}·· ··· ${digits.slice(-3)}`
}

const REMIND_CHOICES = [
  { key: '1', label: '1 day' },
  { key: '2', label: '2 days' },
  { key: '3', label: '3 days' },
  { key: '7', label: '7 days' },
]
const remindKeyOf = (stopped: boolean, days: number[]) => stopped ? 'never' : days.length === 1 && ['1', '2', '3', '7'].includes(String(days[0])) ? String(days[0]) : 'other'

/** "Six people have no role described yet.": the missing roles said once, for the whole list. */
export function noRoleYetSentence(n: number): string {
  const count = numberUpToTenInWords(n)
  return `${count.charAt(0).toUpperCase()}${count.slice(1)} ${n === 1 ? 'person has' : 'people have'} no role described yet.`
}

/** What a person's row is opened to show under it. */
type ARowPart = 'role' | 'number' | 'card' | 'report' | null

export function PeopleAndSetupAsPictured(props: PeopleAndSetupProps) {
  const { ground, user, id, isInitiator, isOrgAdmin, viewerIsAParty, mySessionsDone, plannedSessions } = props
  const g: any = ground
  const qc = useQueryClient()
  const canEditRunOrAdmin = typeof g?.mayChangeSetup === 'boolean' ? g.mayChangeSetup === true : (isInitiator || isOrgAdmin)
  const canEditLeadOnly = isInitiator
  const leadFirst = (props.whoIsInThisLeadName ?? '').split(/\s+/)[0] || 'the person who runs it'

  const { data: served, isError: servedFailed } = useQuery({
    queryKey: ['people-and-setup', id],
    queryFn: () => groundsApi.peopleAndSetup(id),
    enabled: !!id,
    retry: false,
  })
  const page = served && served.on && (served.view === 'lead' || served.view === 'admin') ? (served as Served) : null
  const { data: started } = useQuery({ queryKey: ['getting-started', id], queryFn: () => groundsApi.whereEachPersonIsGettingStarted(id), enabled: !!id, retry: false })
  const { data: numbers } = useQuery({ queryKey: ['whatsapp-roster', id], queryFn: () => groundsApi.whereEachPersonIsOnWhatsApp(id), enabled: !!id, retry: false })
  /* Who asked to join, for the lead (moved here with the roster from "Who has answered"). */
  const { data: requests = [] } = useQuery({ queryKey: ['participant-requests', id], queryFn: () => participantRequestsApi.list(id), enabled: !!id && isInitiator, retry: false })

  /* ---------- the drafts: nothing applies until "Save changes" ---------- */
  const recordReminderDays: number[] = (g?.chaseAfterDays ?? [1]) as number[]
  const onRecord = useMemo(() => ({
    label: g?.label ?? '',
    /* The one kind, as the server serves it for this page: the kind the board draws (people-and-setup.ts). */
    kindOfWork: page?.kindOfWork ?? '',
    remind: remindKeyOf(!!g?.chasingStopped, recordReminderDays),
    remindOther: recordReminderDays.join(', '),
    tellTheLead: !!g?.tellTheLead,
    where: g?.overWhatsApp === true ? 'on' : g?.overWhatsApp === false ? 'in' : 'whatever',
    simplerWords: !!g?.simplerWords,
    expectsUnblocking: props.expectsUnblocking,
    peersVisible: props.peersVisible,
    contactHidden: props.contactHidden,
    workTogether: g?.peopleWorkTogether == null ? '' : g.peopleWorkTogether ? 'yes' : 'no',
    numbersShared: props.numbersShared,
    sharesAt: g?.reportSharesAt ? 'self' : 'you',
  }), [g?.label, page?.kindOfWork, g?.chasingStopped, recordReminderDays.join(','), g?.tellTheLead, g?.overWhatsApp, g?.simplerWords, props.expectsUnblocking, props.peersVisible, props.contactHidden, g?.peopleWorkTogether, props.numbersShared, g?.reportSharesAt])
  const [draft, setDraft] = useState(onRecord)
  useEffect(() => { setDraft(onRecord) }, [onRecord])
  const [roles, setRoles] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof onRecord>(k: K, v: (typeof onRecord)[K]) => setDraft((d) => ({ ...d, [k]: v }))

  /* Which setting's editor is open: "Change" opens one, and pressing it again closes it. */
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => setEditing((e) => ({ ...e, [k]: !e[k] }))
  useEffect(() => { if (props.forceOpenTimeframe) setEditing((e) => ({ ...e, long: true })) }, [props.forceOpenTimeframe])

  const changedKeys = (Object.keys(onRecord) as (keyof typeof onRecord)[]).filter((k) => draft[k] !== onRecord[k] && !(k === 'remindOther' && draft.remind !== 'other'))
  const rolesChanged = Object.entries(roles).filter(([pid, v]) => v.trim() !== ((g?.participants ?? []).find((p: any) => p.id === pid)?.roleAsDescribed ?? '').trim())
  const startChanged = props.canOfferStartDate && props.startsAtDraft !== props.startsAtOnRecord
  /*
   * RELEASE 2: THE TYPE, CONFIRMED BY THE LEAD. Served only where the scenario has types of its own; then the Kind of work line offers
   * those types with the one Groundwork read already chosen. Nothing is stored until the lead saves; saving stores her choice as
   * confirmed. Where it is not served, the line is today's kind of work.
   */
  const typeServed = page?.checkInType ?? null
  const templatesQ = useQuery({ queryKey: ['templates'], queryFn: groundsApi.templates, enabled: !!id, staleTime: 5 * 60_000, retry: false })
  const attachTemplate = useMutation({
    mutationFn: (template: string | null) => groundsApi.setTemplate(id, template),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ground', id] }); qc.invalidateQueries({ queryKey: ['board', id] }); toast.success('Saved. The board and the check-ins follow the template now.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. Try again.'),
  })
  const [typeDraft, setTypeDraft] = useState<string>(typeServed?.type ?? '')
  useEffect(() => { setTypeDraft(typeServed?.type ?? '') }, [typeServed?.type, typeServed?.confirmed])
  const typeToConfirm = !!typeServed?.mayConfirm && !!typeDraft && (typeDraft !== typeServed.type || !typeServed.confirmed)
  const anyChange = changedKeys.length > 0 || rolesChanged.length > 0 || props.theTimeframeChanged || startChanged || typeToConfirm

  const setKind = useMutation({
    mutationFn: (kind: string | null) => groundsApi.setKindOfWork(id, { kind }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ground', id] }); qc.invalidateQueries({ queryKey: ['people-and-setup', id] }); qc.invalidateQueries({ queryKey: ['board', id] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The kind of work did not change. Try again in a moment.'),
  })
  const confirmType = useMutation({
    mutationFn: (type: string) => groundsApi.confirmTheType(id, type),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ground', id] }); qc.invalidateQueries({ queryKey: ['people-and-setup', id] }); qc.invalidateQueries({ queryKey: ['board', id] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The kind of work was not confirmed. Try again in a moment.'),
  })
  const setSharesAt = useMutation({
    mutationFn: (time: string | null) => groundsApi.setReportSharesAt(id, time),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ground', id] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change. The report is still shared the same way. Try again in a moment.'),
  })

  /* ---------- what each row can do, moved here with the roster from "Who has answered" ---------- */
  const remind = useMutation({
    mutationFn: (checkInId: string) => conversationApi.remind(checkInId),
    onSuccess: () => toast.success('Reminder sent'),
    onError: () => toast.error('The reminder did not go out, and nobody has been emailed. Try again.'),
  })
  const copyInviteLink = useMutation({
    mutationFn: async (participantId: string) => {
      const { inviteUrl } = await groundsApi.getParticipantInviteUrl(id, participantId)
      if (!(await copy(inviteUrl))) throw new Error('Copying is not available here. Select the link and copy it yourself.')
      return inviteUrl
    },
    onSuccess: () => toast.success('Invite link copied. It is the same link as their email, so send it however you like.'),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Could not get the invite link.'),
  })
  /* Once they have accepted, the link to the check-in that is open now. It mints nothing. */
  const copyCheckInLink = useMutation({
    mutationFn: async (participantId: string) => {
      const { checkInUrl } = await groundsApi.getParticipantCheckInUrl(id, participantId)
      if (!(await copy(checkInUrl))) throw new Error('Copying is not available here. Select the link and copy it yourself.')
      return checkInUrl
    },
    onSuccess: () => toast.success('Check-in link copied. Send it however you like.'),
    /* The server's sentence: it knows whether they have no open check-in or have not accepted yet. */
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Could not get the check-in link.'),
  })
  const approveRequest = useMutation({
    /* The server invites the person as part of approving the request; nothing else is called. */
    mutationFn: (req: ParticipantRequest) => participantRequestsApi.update(id, req.id, 'APPROVED'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['participant-requests', id] })
      qc.invalidateQueries({ queryKey: ['ground', id] })
      toast.success('They have been added to the check-in.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not add them.'),
  })
  const dismissRequest = useMutation({
    mutationFn: (reqId: string) => participantRequestsApi.update(id, reqId, 'DISMISSED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['participant-requests', id] }),
    onError: () => toast.error('That request was not dismissed, and it is still in the list. Try again.'),
  })

  const discard = () => {
    setDraft(onRecord)
    setTypeDraft(typeServed?.type ?? '')
    setRoles({})
    props.setTimelineDaysDraft(g?.timelineDays)
    props.setCadenceDraft(g?.cadence as GroundCadence)
    props.setWorkingDaysDraft(Array.isArray(g?.workingDays) ? g.workingDays : [])
    props.setAnchorDayDraft(g?.cadenceAnchorDay ?? null)
    props.setStartsAtDraft(props.startsAtOnRecord)
  }

  /* One press is one save: every write "Save changes" makes, so the button waits while any of them is on its way. */
  const saving = [props.saveSetup, setKind, confirmType, props.setChasing, props.setOverWhatsApp, props.setSimplerWords, props.setExpectThemToUnblock,
    props.setPeerVisibility, props.setContactVisibility, props.setWorkTogether, props.setWhoSeesTargets, setSharesAt, props.updateRole].some((m) => m.isPending)
  const save = () => {
    if (saving) return
    const patch: Record<string, unknown> = {}
    if (changedKeys.includes('label') && draft.label.trim()) patch.label = draft.label.trim()
    if (props.theTimeframeChanged) Object.assign(patch, theTimeframeToSave(props))
    if (startChanged) patch.startsAt = props.startsAtDraft || undefined
    if (Object.keys(patch).length) props.saveSetup.mutate(patch)
    if (changedKeys.includes('kindOfWork')) setKind.mutate(draft.kindOfWork || null)
    if (typeToConfirm) confirmType.mutate(typeDraft)
    if (changedKeys.includes('remind') || changedKeys.includes('remindOther')) {
      if (draft.remind === 'never') props.setChasing.mutate({ stopped: true })
      else {
        const days = draft.remind === 'other'
          ? draft.remindOther.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 365)
          : [Number(draft.remind)]
        props.setChasing.mutate({ ...(g?.chasingStopped ? { stopped: false } : {}), ...(days.length ? { days } : {}) })
      }
    }
    if (changedKeys.includes('tellTheLead')) props.setChasing.mutate({ tellTheLead: draft.tellTheLead })
    if (changedKeys.includes('where')) props.setOverWhatsApp.mutate(draft.where === 'on' ? true : draft.where === 'in' ? false : null)
    if (changedKeys.includes('simplerWords')) props.setSimplerWords.mutate(draft.simplerWords)
    if (changedKeys.includes('expectsUnblocking')) props.setExpectThemToUnblock.mutate(draft.expectsUnblocking)
    if (changedKeys.includes('peersVisible')) props.setPeerVisibility.mutate(draft.peersVisible)
    if (changedKeys.includes('contactHidden')) props.setContactVisibility.mutate(draft.contactHidden)
    if (changedKeys.includes('workTogether') && draft.workTogether) props.setWorkTogether.mutate(draft.workTogether === 'yes')
    if (changedKeys.includes('numbersShared')) props.setWhoSeesTargets.mutate(draft.numbersShared)
    if (changedKeys.includes('sharesAt')) setSharesAt.mutate(draft.sharesAt === 'self' ? '18:30' : null)
    for (const [participantId, role] of rolesChanged) props.updateRole.mutate({ participantId, role: role.trim() })
    setRoles({})
    setEditing({})
    setRolesOpen(false)
    qc.invalidateQueries({ queryKey: ['people-and-setup', id] })
  }

  /* ---------- who's in it ---------- */
  const participants: any[] = g?.participants ?? []
  const leavesOutTheManager = g?.scenario === 'HELP_TEAM_UNDERSTAND'
  const isNotCounted = (p: any) => leavesOutTheManager && p.managingOnly === true
  const counted = participants.filter((p) => !isNotCounted(p))
  const nextSeat = useTheNextSeat()
  const seats = props.billingStatus?.people
  const seatsFull = !nextSeat.data?.addsASeat && seats?.cap != null && seats?.count != null && seats.count >= seats.cap
  const [showAdd, setShowAdd] = useState(false)
  const [showLink, setShowLink] = useState(false)
  /* What each person's row is opened to show under it: their role field, their number, their card, or the report they shared. */
  const [rowPart, setRowPart] = useState<Record<string, ARowPart>>({})
  const openPart = (pid: string, part: ARowPart) => setRowPart((r) => ({ ...r, [pid]: r[pid] === part ? null : part }))
  /* "Add their roles": every row with no role opens its role field at once. */
  const [rolesOpen, setRolesOpen] = useState(false)
  const scrollToRow = (pid: string) => scrollToId(`person-${pid}`)

  const problems = page?.problems ?? []
  const noRole = problems.filter((pr) => pr.fix === 'add-their-role')
  const otherProblems = problems.filter((pr) => pr.fix !== 'add-their-role')
  const fixIt = (pr: ASetupProblem) => {
    const p = participants.find((x) => x.id === pr.participantId)
    if (pr.fix === 'fix-the-address' && p) { props.setFixingEmailId(p.id); props.setFixingEmailValue(p.email ?? ''); scrollToRow(p.id) }
    if (pr.fix === 'add-a-number') { setRowPart((r) => ({ ...r, [pr.participantId]: 'number' })); scrollToRow(pr.participantId) }
  }
  const FIX_SAID: Record<string, string> = { 'fix-the-address': 'Fix the address', 'add-a-number': 'Add a number' }

  const cadenceKey = howOftenKey(props.cadenceDraft, props.workingDaysDraft)
  const chooseHowOften = (key: string) => {
    const cadence = (key === 'weekday' || key === 'day' ? 'DAILY' : key) as GroundCadence
    if (cadence !== props.cadenceDraft) props.setAnchorDayDraft(null)
    props.setCadenceDraft(cadence)
    if (key === 'weekday') props.setWorkingDaysDraft([...WEEKDAYS])
    if (key === 'day') props.setWorkingDaysDraft([])
  }
  const orgName = page?.organisationName ?? g?.organization?.name ?? 'your organisation'
  const whatsAppHere = props.whatsAppIsOn && !!g?.orgHasWhatsApp
  const WHERE = [
    { key: 'whatever', label: `Whatever ${orgName} does, which is WhatsApp for anyone with a number`, says: `Here, or on WhatsApp through ${orgName}’s number for anyone with a number on their profile.` },
    { key: 'on', label: 'On WhatsApp', says: 'On WhatsApp. The check-in, the reminders and the report go to their phone, and their reply is their answer.' },
    { key: 'in', label: 'In Groundwork only', says: 'Here, in Groundwork only.' },
  ]
  /* The server's one answer (people-and-setup.ts, whoElseHasAnswered), never this session's count (release test 22 November, bug N6). */
  const nobodyElseAnswered = page?.stillATest === true
  const n = sessionsUpToTheEnd(props) ?? sessionsFor(props.timelineDaysDraft, props.cadenceDraft) ?? 1
  const weeklyOrMonthly = props.cadenceDraft === 'WEEKLY' || props.cadenceDraft === 'FORTNIGHTLY' || props.cadenceDraft === 'MONTHLY'

  /* ---------- the summary line each setting reads, from the record ---------- */
  const often = theRhythmInFull(g, { stop: false }) ?? cadenceLabel(g?.cadence, g?.cadenceDays)
  const howOftenSays = `${often}.${anchorDaySentence(g?.cadence, g?.cadenceAnchorDay, g?.cadenceDays)}`
  const from = whenItWas((g?.startsAt ?? g?.createdAt) as string, 'dayAndMonthLong')
  const howLongSays = [
    g?.runsUntilItIsEnded ? `From ${from}, until you end it.` : g?.endsOn ? `${from} to ${whenItWas(g.endsOn, 'dayAndMonthLong')}.` : null,
    page?.sessions ?? null,
    typeof g?.daysLeft === 'number' && g?.endsOn ? `${g.daysLeft} day${g.daysLeft === 1 ? '' : 's'} left.` : null,
  ].filter(Boolean).join(' ')
  const remindersSays = g?.chasingStopped
    ? 'Off. Nobody is reminded.'
    : `${chasingSentence(recordReminderDays)} Never more than one a day.${g?.tellTheLead && isInitiator ? ' You are told who never started.' : ''}`
  const kindLabel = (k: string | null | undefined) => (k ? ((KIND_OF_WORK_OPTION_LABEL as Record<string, string>)[k] ?? k) : 'Not known yet.')
  const templateName = templatesQ.data?.templates.find((t) => t.id === g?.templateId)?.name ?? 'None.'
  const peersOptions = [{ key: 'named', label: 'Seen once the team’s report is shared, with names.' }, { key: 'unnamed', label: 'Seen once the team’s report is shared, without names.' }]
  const contactOptions = [{ key: 'hidden', label: 'Hidden from each other.' }, { key: 'visible', label: 'Visible, so people can contact each other.' }]
  const togetherOptions = [
    ...(draft.workTogether === '' ? [{ key: '', label: 'Not said yet, so it is assumed from the kind of check-in.' }] : []),
    { key: 'yes', label: 'They see each other’s work day to day, so they can confirm it.' },
    { key: 'no', label: 'They don’t see each other’s work.' },
  ]
  const targetOptions = [{ key: 'shared', label: 'Each person sees their own share and the team’s total.' }, { key: 'own', label: 'Each person sees only their own number.' }]
  const reportOptions = [{ key: 'you', label: 'You share it when it’s ready.' }, { key: 'self', label: `It shares itself at ${g?.reportSharesAt ? clock(g.reportSharesAt) : '6:30pm'}.` }]
  const reportNow = g?.report?.releasedAt
    ? `Shared on ${whenItWas(g.report.releasedAt, 'dayAndMonthLong')}.`
    : g?.status === 'REPORT_READY' ? 'It is ready, and has not been shared yet.' : 'Not shared yet.'

  /** A setting as one line: its label, what it is now, and "Change" for whoever may change it, which opens its editor under it. */
  const aSetting = (key: string, label: string, says: ReactNode, canChange: boolean, editor?: ReactNode, change = 'Change') => (
    <FieldRow
      key={key}
      label={label}
      value={(
        <Stack gap={8}>
          {typeof says === 'string' ? <span>{says}</span> : says}
          {canChange && editing[key] && editor}
        </Stack>
      )}
      action={canChange && editor ? <button type="button" className="gwui-plain-link" aria-expanded={!!editing[key]} aria-label={`${editing[key] ? 'Close' : change}, ${label}`} onClick={() => toggle(key)}>{editing[key] ? 'Close' : change}</button> : undefined}
    />
  )
  /** One choice, as a select, for a setting with a few answers. */
  const choose = (label: string, value: string, options: { key: string; label: string }[], onChange: (k: string) => void) => (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</Select>
  )
  const said = (options: { key: string; label: string }[], key: string) => options.find((o) => o.key === key)?.label ?? ''

  /* ---------- one person's row ---------- */
  const inOrder = [...participants].sort((a, b) => (a.userId === g?.initiatorId ? -1 : b.userId === g?.initiatorId ? 1 : 0))
  const aPerson = (p: any) => {
    const row = whereThisPersonIs(p, {
      ground: g, isInitiator, isOrgAdmin, isNotCounted, sessionParties: props.whoIsInThisParties, notOpenYet: props.whoIsInThisNotOpenYet,
      fixingEmailId: props.fixingEmailId, setFixingEmailId: props.setFixingEmailId, fixingEmailValue: props.fixingEmailValue,
      setFixingEmailValue: props.setFixingEmailValue, fixEmail: props.fixEmail, resendInvite: props.resendInvite,
    })
    const isSelf = !!user?.id && p.userId === user.id
    const stage = ((started?.people ?? []) as { participantId: string; reached: number; says: string }[]).find((x) => x.participantId === p.id)
    const onWhatsApp = ((numbers ?? []) as any[]).find((x) => x.participantId === p.id)
    const phone = onWhatsApp?.phone ?? null
    const problem = row.statusText !== 'Checking in' && row.statusText !== 'Runs it'
    /* Their status, said once: the problem that stops them; on your own row, your own count; for anybody else, whether they have
       answered the check-in that is open (the question "Who has answered" was for), else where they are in getting started. */
    const status = problem
      ? (row.help?.text ?? `${row.statusText}.`)
      : isSelf && p.managingOnly
        ? 'You check in when you choose. Use Check in yourself any time.'
        : isSelf && viewerIsAParty
          /* Your own row says your own count, as served, clamped (B-012): one sentence, never a second one about this check-in beside it. */
          ? yourSessionsSentence(mySessionsDone, plannedSessions)
          : row.sessionLine ?? stage?.says ?? `${row.statusText}.`
    const theirSessions = [...(g?.checkIns ?? [])]
      .filter((c: any) => c.participantId === p.id && !c.isSetup)
      .sort((a: any, b: any) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0))
    const latest = theirSessions[theirSessions.length - 1]
    const expectation = p.objective?.text?.trim()
      ? (p.objective.seenBySubject
        ? (isSelf ? 'Your expectation is set. You have seen it.' : 'Their expectation is set. They have seen it.')
        : (isSelf ? 'Your expectation is set. You have not seen it yet.' : 'Their expectation is set. They have not seen it yet.'))
      : null
    const part: ARowPart = rowPart[p.id] ?? null
    const roleOpen = isInitiator && (part === 'role' || (rolesOpen && !p.roleAsDescribed?.trim()))
    const bounced = !p.userId && p.inviteDeliveryStatus === 'BOUNCED'
    const menu: { label: string; act: () => void }[] = [
      ...(isInitiator ? [{ label: p.roleAsDescribed?.trim() ? 'Change their role here' : 'Add their role here', act: () => openPart(p.id, 'role') }] : []),
      ...(props.eachPerson && !p.managingOnly ? [{ label: isSelf ? 'What is on record for you' : 'What is on record for them', act: () => openPart(p.id, 'card') }] : []),
      ...(isInitiator && latest?.id && latest.status !== 'COMPLETED' && p.userId && !isSelf ? [{ label: 'Send them a reminder', act: () => remind.mutate(latest.id) }] : []),
      ...(isInitiator && !p.userId && !p.awaitingSeat ? [{ label: 'Copy their invite link', act: () => copyInviteLink.mutate(p.id) }] : []),
      ...(isInitiator && bounced ? [{ label: 'Fix the address', act: () => { props.setFixingEmailId(p.id); props.setFixingEmailValue(p.email ?? '') } }] : []),
      ...(p.sharedSoloReport ? [{ label: 'Read the report they shared with you', act: () => openPart(p.id, 'report') }] : []),
    ]
    return (
      <li id={`person-${p.id}`} key={p.id} className="ds-row">
        <div className="ds-row-main">
          <Stack gap={4}>
            <p className="ds-text-card">{row.name}</p>
            {p.userId && p.email && <p className="ds-text-secondary">{p.email}</p>}
            {/* The lead reads her own note; anybody else reads only that there is one, as the server serves it, never its words. */}
            {isInitiator
              ? p.roleAsDescribed?.trim() && <p className="ds-text-secondary" data-leads-note>{theLeadsNote(p.roleAsDescribed)}</p>
              : page?.roleDescribed?.[p.id] && <p className="ds-text-secondary">{`${leadFirst.charAt(0).toUpperCase()}${leadFirst.slice(1)} has described their role here.`}</p>}
            <p className="ds-text-secondary">{status}{problem && row.help?.action ? <>{' '}{row.help.action}</> : null}</p>
            <p className="ds-text-secondary">
              {phone
                ? <>{`${isSelf ? 'Your' : 'Their'} phone number is ${aNumberAsShown(phone)}.`}{props.whatsAppIsOn && onWhatsApp?.says && !isSelf ? ` ${onWhatsApp.says}` : null}{' '}<button type="button" className="gwui-plain-link" onClick={() => openPart(p.id, 'number')}>Change</button></>
                : <>No phone number yet.{' '}<button type="button" className="gwui-plain-link" onClick={() => openPart(p.id, 'number')}>Add a number</button></>}
            </p>
            <div className="gwui-button-row">
              <span className="ds-text-meta">{`${row.when}.`}</span>
              {theirSessions.length > 0 && <span className="ds-text-meta">Check-ins</span>}
                {theirSessions.map((ci: any) => {
                  const done = ci.status === 'COMPLETED'
                  const going = ci.status === 'IN_PROGRESS'
                  return (
                    <button
                      key={ci.id}
                      type="button"
                      disabled={!isSelf}
                      onClick={isSelf ? () => props.navigate(`/checkin/${ci.id}`, { state: { sessionNumber: ci.sessionNumber, isFinal: ci.isFinal ?? false, groundLabel: g?.label, groundId: id, isInitiator } }) : undefined}
                      aria-label={`Check-in ${ci.sessionNumber}: ${done ? 'completed' : going ? 'in progress' : 'not started'}${isSelf ? ', yours' : ''}`}
                      className={`tag ${done ? 'rec' : going ? 'att' : 'plain'} gwui-tag-control`}
                    >
                      {ci.sessionNumber}
                    </button>
                  )
                })}
            </div>
            {expectation && <p className="ds-text-meta">{expectation}</p>}
            {roleOpen && (
              <TextField
                aria-label={`Their role here, for ${row.name}`}
                placeholder="Their role here, in a few words"
                value={roles[p.id] ?? p.roleAsDescribed ?? ''}
                onChange={(e) => setRoles((r) => ({ ...r, [p.id]: e.target.value }))}
              />
            )}
            {part === 'number' && <TheirNumber groundId={id} participantId={p.id} name={row.name} phone={phone} onDone={() => openPart(p.id, null)} />}
            {part === 'card' && props.eachPerson?.(p.id)}
            {part === 'report' && p.sharedSoloReport && <SoloReportBody report={p.sharedSoloReport as Record<string, unknown>} dense on="light" />}
          </Stack>
        </div>
        <div className="ds-row-actions">
          {isInitiator && p.userId && !(isSelf && p.managingOnly) && (
            <button type="button" className="gwui-plain-link" disabled={copyCheckInLink.isPending} onClick={() => copyCheckInLink.mutate(p.id)}>Copy check-in link</button>
          )}
          {menu.length > 0 && (
            <SmallMenu label="···" ariaLabel={`More for ${row.name}`}>
              {menu.map((m) => <button key={m.label} type="button" className="gwui-menu-item" onClick={(e) => { e.currentTarget.closest('details')?.removeAttribute('open'); m.act() }}>{m.label}</button>)}
            </SmallMenu>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="wrap gw-stack gwui-b-tab">
      {/* HOW THIS CHECK-IN RUNS, in one line, then what to put right: each problem once, and the missing roles as one line. */}
      <section aria-label="How this check-in runs">
        <Stack gap={8}>
          {page ? <p className="gwui-b8-line">{page.howItRuns}</p> : servedFailed ? <Note>This part of the page could not be loaded. Try again in a moment.</Note> : null}
          {(otherProblems.length > 0 || noRole.length > 0) && (
            <ul className="ds-rows" aria-label="What to put right">
              {otherProblems.map((pr) => (
                <li key={`${pr.participantId}-${pr.fix}-${pr.says}`} className="ds-row">
                  <p className="ds-row-main ds-text-secondary">{pr.says}</p>
                  <div className="ds-row-actions">
                    {pr.fix && FIX_SAID[pr.fix] && <button type="button" className="gwui-plain-link" onClick={() => fixIt(pr)}>{FIX_SAID[pr.fix]}</button>}
                    {pr.fix === 'let-them-in' && <Link className="gwui-plain-link" to="/org/members">Let them in on People</Link>}
                    {pr.fix === 'view-plans' && <Link className="gwui-plain-link" to="/billing">View plans</Link>}
                  </div>
                </li>
              ))}
              {noRole.length > 0 && (
                <li className="ds-row">
                  <p className="ds-row-main ds-text-secondary">{noRoleYetSentence(noRole.length)}</p>
                  {isInitiator && noRole.some((pr) => pr.fix) && (
                    <div className="ds-row-actions">
                      <button type="button" className="gwui-plain-link" onClick={() => { setRolesOpen(true); scrollToRow(noRole[0].participantId) }}>
                        {noRole.length === 1 ? 'Add their role' : 'Add their roles'}
                      </button>
                    </div>
                  )}
                </li>
              )}
            </ul>
          )}
        </Stack>
      </section>

      {/* WHO'S IN IT: the one list of people. */}
      <Section
        heading="Who's in it"
        note={whosInItSays(counted)}
        action={isInitiator ? (
          <FlexRow gap={8} wrap>
            {g?.joinToken && <Button kind="quiet" size="small" onClick={() => setShowLink((v) => !v)}>Join link and QR code</Button>}
            <Button size="small" onClick={() => setShowAdd((v) => !v)}>Add people</Button>
          </FlexRow>
        ) : undefined}
      >
        <div className="ds-section-body">
          {isInitiator && showLink && g?.joinToken && (
            <TheJoinLink joinToken={g.joinToken} label={g.label} joined={page?.joinedWithTheLink ?? null} onShareCode={props.onShareCode} />
          )}
          {isInitiator && showAdd && (
            <AddPeopleForm
              isOrgAdmin={isOrgAdmin} colleagues={props.colleagues} participants={participants} seats={seats} seatsFull={seatsFull}
              addManyParticipants={props.addManyParticipants} onShareCode={props.onShareCode}
            />
          )}
          {isInitiator && (requests as ParticipantRequest[]).length > 0 && (
            <ul className="ds-rows" aria-label="Asked to join">
              {(requests as ParticipantRequest[]).map((req) => (
                <li key={req.id} className="ds-row">
                  <div className="ds-row-main">
                    <p className="ds-text-card">{req.requestedName ? `${req.requestedName} asked to join` : `${req.requestedEmail} asked to join`}</p>
                    <p className="ds-text-secondary">{req.reason}</p>
                    <p className="ds-text-meta">{`${req.requestedName ? `${req.requestedEmail}. ` : ''}Asked by ${req.requestedByEmail}.`}</p>
                  </div>
                  <div className="ds-row-actions">
                    <button type="button" className="gwui-plain-link" disabled={approveRequest.isPending} onClick={() => approveRequest.mutate(req)}>Add them</button>
                    <button type="button" className="gwui-plain-link" disabled={dismissRequest.isPending} onClick={() => dismissRequest.mutate(req.id)}>Dismiss</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {/* Ten a page, every page reachable, the one shared list part. */}
          <ul className="ds-rows" aria-label="Who's in it">
            <Paged label="who's in it" items={inOrder} render={aPerson} />
          </ul>
          {props.downAsDoing}
        </div>
      </Section>

      {/* HOW IT RUNS: one line per setting, each with its own "Change". */}
      <div id="how-long-this-runs" />
      <Section heading="How it runs">
        <FieldRows>
          {aSetting('often', 'How often', howOftenSays, canEditRunOrAdmin, (
            <Stack gap={8}>
              <FieldLabel htmlFor="how-often">How often</FieldLabel>
              <Select id="how-often" value={cadenceKey} onChange={(e) => chooseHowOften(e.target.value)}>
                {HOW_OFTEN.map((h) => <option key={h.key} value={h.key}>{h.label}</option>)}
              </Select>
              {(cadenceKey === 'weekday' || cadenceKey === 'day') && (
                <WhichDaysTheyWork value={props.workingDaysDraft} onChange={props.setWorkingDaysDraft} explained={false} />
              )}
              {weeklyOrMonthly && (
                <>
                  <AnchorDayPicker cadence={props.cadenceDraft} anchorDay={props.anchorDayDraft} onAnchorDay={props.setAnchorDayDraft} idPrefix="people-and-setup" />
                  <Folded summary="The days this team works">
                    <WhichDaysTheyWork value={props.workingDaysDraft} onChange={props.setWorkingDaysDraft} explained={false} />
                  </Folded>
                </>
              )}
              {props.theTimeframeChanged && <Note>{`${props.timelineDaysDraft} days, ${n} check-in${n === 1 ? '' : 's'}.`}</Note>}
            </Stack>
          ))}
          {aSetting('long', 'How long', howLongSays, canEditRunOrAdmin, (
            <FlexRow gap={16} wrap align="flex-start">
              <Stack gap={8}>
                <FieldLabel htmlFor="starts">Starts</FieldLabel>
                {props.canOfferStartDate
                  ? <TextField id="starts" type="date" value={props.startsAtDraft} onChange={(e) => props.setStartsAtDraft(e.target.value)} />
                  : <Text size="15" as="p">{from}</Text>}
              </Stack>
              <Stack gap={8}>
                <FieldLabel htmlFor="ends">Ends</FieldLabel>
                <TextField
                  id="ends" type="date" autoFocus
                  value={theEndOnTheField(props.startsAtOnRecord, props.createdAtOnRecord, props.timelineDaysDraft)}
                  onChange={(e) => {
                    const start = props.startsAtOnRecord ? new Date(props.startsAtOnRecord) : props.createdAtOnRecord ? new Date(props.createdAtOnRecord) : new Date()
                    const days = Math.round((new Date(e.target.value).getTime() - start.getTime()) / 86_400_000)
                    if (Number.isFinite(days) && days >= 1) props.setTimelineDaysDraft(days)
                  }}
                />
              </Stack>
            </FlexRow>
          ), 'Give it more time')}
          {aSetting('where', 'Where people answer', whatsAppHere ? said(WHERE.map((w) => ({ key: w.key, label: w.says })), draft.where) : 'Here, in Groundwork only.', whatsAppHere && canEditRunOrAdmin, (
            choose('Where people answer', draft.where, WHERE, (v) => set('where', v))
          ))}
          {aSetting('words', 'Simpler words', draft.simplerWords ? 'On. Short sentences and everyday words, in the check-in and everything sent afterwards.' : 'Off.', canEditRunOrAdmin, (
            <SwitchRow look="checkbox" title="Use simpler words" detail="Short sentences and everyday words, in the check-in and everything sent afterwards" on={draft.simplerWords} onChange={(on) => set('simplerWords', on)} />
          ))}
          {aSetting('remind', 'Reminders', remindersSays, canEditLeadOnly, (
            <Stack gap={8}>
              <FlexRow gap={8} wrap align="center">
                <Text size="15" as="span">Remind people after</Text>
                <Select aria-label="Remind people after" value={draft.remind} onChange={(e) => set('remind', e.target.value)}>
                  {REMIND_CHOICES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  <option value="other">Other days</option>
                  <option value="never">Never</option>
                </Select>
                <Text size="15" as="span">with no answer</Text>
              </FlexRow>
              {draft.remind === 'other' && (
                <Stack gap={4}>
                  <FieldLabel htmlFor="chase-days">Remind after how many days of no answer</FieldLabel>
                  <TextField id="chase-days" value={draft.remindOther} onChange={(e) => set('remindOther', e.target.value)} placeholder="1, 3, 7" />
                </Stack>
              )}
              <SwitchRow look="checkbox" title="Tell me who never started" detail="A separate note to you when somebody has not opened it at all." on={draft.tellTheLead} onChange={(on) => set('tellTheLead', on)} />
            </Stack>
          ))}
          {aSetting('blocked', 'When someone is blocked', draft.expectsUnblocking
            ? 'They are asked what they have already tried, and offered ways through on their own report.'
            : 'What is in their way is recorded, and nothing is asked about what they tried.', canEditRunOrAdmin, (
            <SwitchRow look="checkbox" title="Ask what they’ve already tried" detail="And offer ways through on their own report" on={draft.expectsUnblocking} onChange={(on) => set('expectsUnblocking', on)} />
          ))}
          <TheStartingPoint groundId={id} canRecord={isInitiator} />
        </FieldRows>
      </Section>

      {/* WHO SEES WHAT */}
      <Section heading="Who sees what">
        <FieldRows>
          {aSetting('peers', 'Each other’s check-ins', `${said(peersOptions, draft.peersVisible ? 'named' : 'unnamed')}${g?.peersVisibleToEachOther == null ? ' This is the default for this kind of check-in.' : ''}`, canEditRunOrAdmin, (
            choose('Each other’s check-ins', draft.peersVisible ? 'named' : 'unnamed', peersOptions, (v) => set('peersVisible', v === 'named'))
          ))}
          {aSetting('targets', 'Targets', said(targetOptions, draft.numbersShared ? 'shared' : 'own'), canEditRunOrAdmin, (
            choose('Targets', draft.numbersShared ? 'shared' : 'own', targetOptions, (v) => set('numbersShared', v === 'shared'))
          ))}
          {g?.cadence !== 'ONE_TIME'
            ? aSetting('report', 'The team’s report', `${said(reportOptions, draft.sharesAt)} ${reportNow}`, canEditRunOrAdmin, (
              choose('The team’s report', draft.sharesAt, reportOptions, (v) => set('sharesAt', v))
            ))
            : <FieldRow label="The team’s report" value={reportNow} />}
          {aSetting('contact', 'Email addresses', said(contactOptions, draft.contactHidden ? 'hidden' : 'visible'), canEditLeadOnly, (
            choose('Email addresses', draft.contactHidden ? 'hidden' : 'visible', contactOptions, (v) => set('contactHidden', v === 'hidden'))
          ))}
          {aSetting('together', 'Confirming each other’s work', said(togetherOptions, draft.workTogether), canEditRunOrAdmin, (
            choose('Confirming each other’s work', draft.workTogether, togetherOptions, (v) => set('workTogether', v))
          ))}
          {page?.othersWithAccess && <FieldRow label="Who else can see it" value={page.othersWithAccess} />}
        </FieldRows>
      </Section>

      {/* WHAT IT IS: the name, the scenario, the kind of work and the template, each one line. */}
      <Section heading="What it is">
        <FieldRows>
          {aSetting('name', 'Name', g?.label ?? '', canEditRunOrAdmin, (
            <TextField aria-label="Name" value={draft.label} onChange={(e) => set('label', e.target.value)} />
          ))}
          <FieldRow label="Scenario" value={g?.scenario ? scenarioLabel(g.scenario, g.brief) : 'Not set.'} />
          {typeServed
            ? aSetting('kind', 'Kind of work', (
              <>
                <span>{typeServed.offered.find((t) => t.type === typeServed.type)?.label ?? 'Nobody has said yet.'}</span>
                {typeServed.says && <span className="ds-text-secondary">{typeServed.says}</span>}
              </>
            ), typeServed.mayConfirm, (
              <Select aria-label="Kind of work" value={typeDraft} onChange={(e) => setTypeDraft(e.target.value)}>
                {!typeDraft && <option value="">Not known yet</option>}
                {typeServed.offered.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
              </Select>
            ))
            : aSetting('kind', 'Kind of work', page?.kindOfWork ? kindLabel(page.kindOfWork) : 'Nobody has said yet.', canEditRunOrAdmin && !!page, page ? (
              <Select aria-label="Kind of work" value={draft.kindOfWork} onChange={(e) => set('kindOfWork', e.target.value)}>
                <option value="">Not known yet</option>
                {page.kindsOffered.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
              </Select>
            ) : undefined)}
          {templatesQ.data?.on && aSetting('template', 'Template', templateName, canEditRunOrAdmin, (
            <Stack gap={8}>
              <Select aria-label="Template" value={g?.templateId ?? ''} disabled={attachTemplate.isPending} onChange={(e) => attachTemplate.mutate(e.target.value || null)}>
                <option value="">None</option>
                {templatesQ.data.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <Link to="/templates" className="gwui-plain-link">See every template, and what each tracks</Link>
            </Stack>
          ))}
        </FieldRows>
      </Section>

      {/* RECENT CHANGES, only once there are some. */}
      {props.settingsChangeCount > 0 && (
        <Section heading="Recent changes">
          <Stack gap={4}>
            {[...(g?.settingsChanges ?? [])].reverse().map((c: any, i: number) => <Note key={i}>{settingsChangeSentence(c)}</Note>)}
          </Stack>
        </Section>
      )}

      {/* ENDING IT, as one section of rows: pausing, ending early, deleting, and ending. */}
      <Section heading="Ending it">
        <ul className="ds-rows" aria-label="Ending it">
          {/* PAUSING (release test 22 November, bug 35): its lead or an admin puts it on hold and lifts the hold. */}
          {(isInitiator || isOrgAdmin) && <PauseOrResume groundId={id} status={g?.status} />}
          {/* ENDING EARLY WITH A LAST CHECK-IN, moved here with the roster from "Who has answered": the only way to close early. */}
          {isInitiator && !['RESOLVED', 'CLOSED', 'STALLED', 'AWAITING_LEAD'].includes(g?.status) && <EndEarly groundId={id} />}
          {/* DELETING ONE PEOPLE HAVE ANSWERED (Hafsah, 22 November 2026): the record stays, so it comes off everyone's lists instead. */}
          {(isInitiator || isOrgAdmin) && !nobodyElseAnswered && <TakeItOffEveryList groundId={id} label={g?.label} />}
          {isInitiator ? (
            <li className="ds-row">
              <div className="ds-row-main">
                <Stack gap={8}>
                  <p className="ds-text-secondary">
                    {nobodyElseAnswered
                      ? 'Nobody else has answered yet, so this can still be deleted as a test. Otherwise, ending it stops new check-ins, everything stays as it is, and each person keeps their own history.'
                      : 'Ending it stops new check-ins. Everything stays as it is, and each person keeps their own history. This can’t be undone.'}
                  </p>
                  {props.deleteError && <Note tone="error">{props.deleteError}</Note>}
                  {nobodyElseAnswered && props.confirmDelete && (
                    <FlexRow gap={8} wrap align="center">
                      <span>Delete "{g?.label}" for good? Everything goes, including the conversation, the check-ins and anything uploaded. This cannot be undone.</span>
                      <Button kind="danger" disabled={props.removeGround.isPending} onClick={() => props.removeGround.mutate()}>
                        {props.removeGround.isPending ? 'Deleting…' : 'Yes, delete it'}
                      </Button>
                      <Button kind="secondary" onClick={() => { props.setConfirmDelete(false); props.setDeleteError(null) }}>Keep it</Button>
                    </FlexRow>
                  )}
                </Stack>
              </div>
              <div className="ds-row-actions">
                {nobodyElseAnswered && !props.confirmDelete && (
                  <Button kind="secondary" redText onClick={() => { props.setDeleteError(null); props.setConfirmDelete(true) }}>Delete this test</Button>
                )}
                <a className="btn sec red" href={`/grounds/${id}/end`}>Decide how it ends</a>
              </div>
            </li>
          ) : (
            <li className="ds-row">
              <p className="ds-row-main ds-text-secondary">
                {`You can't end a check-in you don't run. Ask us and we'll end it, usually the same day.`}
                {isOrgAdmin && (props.whoIsInThisLeadName ? ` ${props.whoIsInThisLeadName} runs it, so ending it ends something they are running.` : ' Somebody else runs it, so ending it ends something they are running.')}
              </p>
              <div className="ds-row-actions">
                <a className="btn sec red" href={`mailto:hello@myground.work?subject=Archive check-in: ${encodeURIComponent(g?.label ?? '')}`}>Ask us to end this check-in</a>
              </div>
            </li>
          )}
        </ul>
      </Section>

      {/* THE SAVE BAR: nothing applies until it is saved. */}
      {anyChange && (
        <div role="region" aria-label="Unsaved changes" style={{ position: 'sticky', bottom: 0, zIndex: 5 }}>
          <Panel>
            <FlexRow gap={12} justify="space-between" align="center" wrap>
              <Text size="15" as="p">You have changes. They apply from the next check-in. Check-ins already done keep their dates.</Text>
              <FlexRow gap={8}>
                <Button kind="secondary" onClick={discard}>Discard</Button>
                <Button kind="secondary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</Button>
              </FlexRow>
            </FlexRow>
          </Panel>
        </div>
      )}
    </div>
  )
}

/**
 * END EARLY WITH A LAST CHECK-IN (moved here from "Who has answered" with the roster, 24 November 2026). Everyone's next check-in
 * becomes their final one; nothing else calls beginClosingSession, so this is the only way to close early.
 */
function EndEarly({ groundId }: { groundId: string }) {
  const qc = useQueryClient()
  const [asking, setAsking] = useState(false)
  const closing = useMutation({
    mutationFn: () => groundsApi.beginClosingSession(groundId),
    onSuccess: (r) => {
      toast.success(`The last check-in has begun. ${r.participantsFlagged} ${r.participantsFlagged === 1 ? 'person' : 'people'} will do their last one.`)
      setAsking(false)
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
    },
    onError: () => toast.error('The last check-in did not open. Nothing has changed for anyone. Try again.'),
  })
  return (
    <li className="ds-row" aria-label="Ending early">
      <div className="ds-row-main">
        <Stack gap={8}>
          <p className="ds-text-secondary">Ending early makes everyone’s next check-in their last one. The final report reads the whole record.</p>
          {asking && (
            <FlexRow gap={8} wrap align="center">
              <span>End early? Everyone’s next check-in becomes their final one.</span>
              <Button kind="danger" disabled={closing.isPending} onClick={() => closing.mutate()}>{closing.isPending ? 'Starting it…' : 'Yes, end early'}</Button>
              <Button kind="secondary" onClick={() => setAsking(false)}>Cancel</Button>
            </FlexRow>
          )}
        </Stack>
      </div>
      <div className="ds-row-actions">
        {!asking && <Button kind="secondary" redText onClick={() => setAsking(true)}>End early with a last check-in</Button>}
      </div>
    </li>
  )
}

function clock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h >= 12 ? 'pm' : 'am'}`
}

/** A person's phone number, added or changed in their row, whether WhatsApp is on or off (Hafsah, 30 October 2026). Saved at once, as today: where WhatsApp is on, adding one can send the opening there. */
function TheirNumber({ groundId, participantId, name, phone, onDone }: { groundId: string; participantId: string; name: string; phone: string | null; onDone: () => void }) {
  const qc = useQueryClient()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const keep = async (v: string) => {
    setSaving(true)
    try {
      toast.success((await groundsApi.addTheirWhatsAppNumber(groundId, participantId, v)).said)
      await qc.invalidateQueries({ queryKey: ['whatsapp-roster', groundId] })
      await qc.invalidateQueries({ queryKey: ['people-and-setup', groundId] })
      onDone()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'The number was not kept. Try again.')
    } finally { setSaving(false) }
  }
  return (
    <Stack gap={4}>
      <TextField aria-label={`Phone number for ${name}`} placeholder="0712 345 678" value={value} onChange={(e) => setValue(e.target.value)} />
      <FlexRow gap={6} wrap>
        <Button size="small" kind="secondary" disabled={saving || !value.trim()} onClick={() => keep(value)}>{saving ? 'Saving…' : 'Keep the number'}</Button>
        {phone && <Button size="small" kind="quiet" disabled={saving} onClick={() => keep('')}>Remove</Button>}
        <Button size="small" kind="quiet" onClick={onDone}>Cancel</Button>
      </FlexRow>
    </Stack>
  )
}

/**
 * THE JOIN LINK AND QR CODE (B8, "Join link and QR code"). The product's own open link, `/answer?t=...`: anyone with it can
 * answer without an account and says who they are at the end. The rows the picture has that the product cannot do are
 * said as the one thing it does, never drawn as choices that change nothing.
 */
function TheJoinLink({ joinToken, label, joined, onShareCode }: { joinToken: string; label: string; joined: string | null; onShareCode: () => void }) {
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/answer?t=${joinToken}`
  useEffect(() => {
    import('qrcode').then((Q) => Q.toDataURL(url, { width: 360, margin: 1 }).then(setQr).catch(() => {})).catch(() => {})
  }, [url])
  const printAPoster = () => {
    const w = window.open('', '_blank')
    if (!w || !qr) return
    w.document.write(`<!doctype html><title>${label.replace(/</g, '&lt;')}</title><body style="font-family:sans-serif;text-align:center;padding:40px"><h1>${label.replace(/</g, '&lt;')}</h1><p>Scan the code to answer.</p><img src="${qr}" width="360" height="360" alt=""><p>${url}</p></body>`)
    w.document.close()
    w.focus()
    w.print()
  }
  return (
    <Panel aria-label="Join link and QR code">
      <FlexRow gap={16} wrap align="flex-start">
        <Stack gap={8}>
          {qr && <img src={qr} alt="" width={140} height={140} />}
          <FlexRow gap={6}>
            {qr && <a className="btn sec sm" href={qr} download="check-in-qr-code.png">Download</a>}
            <Button kind="secondary" size="small" onClick={printAPoster} disabled={!qr}>Print a poster</Button>
          </FlexRow>
        </Stack>
        <Stack gap={10}>
          <Text size="15" weight={700} as="p">{`Anyone with this link can answer ${label}`}</Text>
          <Text size="14" ink="sub" as="p">Scanning the QR code opens the same link. It works on any phone. {SHARE_A_LINK.forWhom} {SHARE_A_LINK.whoCanAnswer}</Text>
          <FlexRow gap={8} wrap align="center">
            <TextField aria-label="Join link" readOnly value={url} />
            <Button kind="secondary" size="small" onClick={async () => { if (await copy(url)) { setCopied(true); setTimeout(() => setCopied(false), 2000) } else toast.error(SHARE_A_LINK.cannotCopy) }}>
              {copied ? 'Copied.' : 'Copy link'}
            </Button>
          </FlexRow>
          <Button kind="quiet" onClick={onShareCode}>Or share an access code instead</Button>
          <FieldRows>
            <FieldRow label="Who gets in" value="Anyone with the link. They answer without an account, and say who they are at the end." />
            <FieldRow label="Their role here" value="They aren't asked for one. You can add it in the list below." />
            <FieldRow label="Works until" value="The check-in ends. After that, the link says the check-in has finished." />
          </FieldRows>
          {joined && <Note>{joined}</Note>}
        </Stack>
      </FlexRow>
    </Panel>
  )
}

/**
 * PAUSE AND RESUME A CHECK-IN (release test 22 November, bug 35: Wairimu found "Give it more time" and "Decide how it ends" and
 * nothing to hold it). The server had both doors (POST /grounds/:id/pause and /resume) but only for admins; its lead or an admin may
 * use them now. A held check-in sends nobody a message and takes nothing new until it is resumed, and resuming puts it back where it was.
 */
export function PauseOrResume({ groundId, status }: { groundId: string | undefined; status: string | null | undefined }) {
  const qc = useQueryClient()
  const held = status === 'PAUSED'
  const live = ['OPEN', 'AWAITING_PARTIES', 'REPORT_READY', 'ACTIVE'].includes(String(status ?? ''))
  const change = useMutation({
    mutationFn: () => (held ? groundsApi.resume(groundId!) : groundsApi.pause(groundId!)),
    onSuccess: () => {
      toast.success(held ? 'The check-in is running again.' : 'The check-in is paused.')
      qc.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey).includes(groundId ?? '') })
      qc.invalidateQueries({ queryKey: ['grounds'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change. Try again.'),
  })
  if (!groundId || (!held && !live)) return null
  return (
    <li className="ds-row" aria-label="Pausing it">
      <p className="ds-row-main ds-text-secondary">
        {held
          ? 'This check-in is paused. Nobody is asked to check in and no reminders go out until you resume it. Everything already written stays as it is.'
          : 'Pausing it stops the check-ins and reminders until you resume it. Everything already written stays as it is.'}
      </p>
      <div className="ds-row-actions">
        <Button kind="secondary" disabled={change.isPending} onClick={() => change.mutate()}>
          {change.isPending ? (held ? 'Resuming…' : 'Pausing…') : held ? 'Resume this check-in' : 'Pause this check-in'}
        </Button>
      </div>
    </li>
  )
}

/**
 * DELETE A CHECK-IN PEOPLE HAVE ANSWERED (Hafsah, 22 November 2026). "Delete this test" only works before anybody else answers,
 * because after that the record stays. Its lead or an admin can still make it go: it comes off everyone's lists, and what people
 * said, the reports and each person's history are kept. The server decides who may (POST /grounds/:id/hide) and every list skips it.
 */
export function TakeItOffEveryList({ groundId, label }: { groundId: string | undefined; label: string | undefined }) {
  const qc = useQueryClient()
  const [asking, setAsking] = useState(false)
  const hide = useMutation({
    mutationFn: () => groundsApi.hide(groundId!),
    onSuccess: () => {
      toast.success(`"${label ?? 'The check-in'}" is deleted from everyone's lists.`)
      qc.invalidateQueries({ queryKey: ['grounds'] })
      window.location.assign('/grounds')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not work. Try again.'),
  })
  if (!groundId) return null
  return (
    <li className="ds-row" aria-label="Deleting it">
      <div className="ds-row-main">
        <Stack gap={8}>
          <p className="ds-text-secondary">
            People have already answered this check-in, so what they said is kept. You can still delete the check-in, and it will be gone from everyone's lists.
          </p>
          {asking && (
            <FlexRow gap={8} wrap align="center">
              <span>Delete "{label}"? It will be gone from everyone's lists, and nobody will be asked to check in again. The words people said are kept.</span>
              <Button kind="danger" disabled={hide.isPending} onClick={() => hide.mutate()}>
                {hide.isPending ? 'Deleting…' : 'Yes, delete it'}
              </Button>
              <Button kind="secondary" onClick={() => setAsking(false)}>Keep it</Button>
            </FlexRow>
          )}
        </Stack>
      </div>
      <div className="ds-row-actions">
        {!asking && <Button kind="secondary" redText onClick={() => setAsking(true)}>Delete this check-in</Button>}
      </div>
    </li>
  )
}
