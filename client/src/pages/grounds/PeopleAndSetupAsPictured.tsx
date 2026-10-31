import { isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi, type GroundCadence, type PeopleAndSetup, type ASetupProblem } from '@/api/grounds'
import {
  Section, Panel, FieldRows, FieldRow, SwitchRow, FieldLabel, TextField, Select, Button, Note, Stack, FlexRow,
  PeopleTable, PeopleTableHead, PersonRow, Tag, Text, Folded,
} from '@/components/gw/ui'
import { AddPeopleForm, whereThisPersonIs, whosInItSays } from '@/components/gw/WhosInItRoster'
import { useTheNextSeat } from '@/components/gw/this-adds-a-seat'
import { StartingPointPanel } from '@/components/gw/StartingPointPanel'
import { WhichDaysTheyWork, WEEKDAYS } from '@/components/gw/WhichDaysTheyWork'
import { AnchorDayPicker } from '@/components/gw/AnchorDayPicker'
import { workingDaysOf } from '@/components/gw/when-the-check-ins-land'
import { statusSentence } from '@/components/gw/MyParticipation'
import { whatThisStatusMeans } from '@/components/gw/what-a-status-means-to-the-person-in-it'
import { copy } from '@/components/gw/copying-can-fail'
import { initialsOf } from '@/pages/org/people-here'
import { scenarioLabel } from '@/lib/scenario-catalog'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { sessionsFor } from '@/lib/cadence'
import { KIND_OF_WORK_OPTION_LABEL } from '@/pages/board/WorkRecords'
import { SHARE_A_LINK } from './ShareSection'
import {
  type PeopleAndSetupProps, chasingSentence, settingsChangeSentence, theEndOnTheField, theTimeframeToSave, sessionsUpToTheEnd,
  peersVisibilitySentence, yourSessionsSentence,
} from './CheckInPeopleAndSetup'
import '@/pages/board/pictured/pictured-board.css'

/**
 * PEOPLE AND SETUP, AS THE B8 PICTURES DRAW IT (Release 1B, pull request 1 of 3; Hafsah's people-and-setup.md of 17 October
 * 2026, the wording from docs/prototype/screens/B8-people-and-setup/*.txt). Drawn only where the organisation's Release 1B
 * switch is on; off, CheckInPeopleAndSetup.tsx draws today's page exactly as it was.
 *
 * ONE TEMPLATE FOR EVERY SCENARIO. Only the words and the data change, and both come from the server: the sentence at the
 * top, the setup problems, the sessions line and who else can see it are served per reader by GET
 * /grounds/:id/people-and-setup; everything else is the check-in's own read. The lead reads the whole page; an admin who does
 * not run it reads the whole page with no ending; a team member never reaches this page (GroundParticipantPage draws their
 * short page, YourPeopleAndSetup.tsx).
 *
 * NOTHING APPLIES UNTIL IT IS SAVED. Every change waits in this page until "Save changes", and is then written through the
 * route that already writes it (the name and the timeframe through PATCH /grounds/:id, the kind of work through PATCH
 * kind-of-work, each "Who sees what" row through its own route). Opening the page writes nothing, so an existing check-in
 * keeps its cadence and every setting until the lead changes one. The server still decides who may change what: a control
 * the reader may not use is drawn as a sentence, never a dead control.
 *
 * ONE NAVY BUTTON, "ADD PEOPLE" (Hafsah, 30 September, the-rebuilt-pages-use-only-the-new-parts.spec.ts): "Copy link" and
 * "Save changes", navy in the picture, are secondary here.
 *
 * WHERE THE PRODUCT IS KEPT OVER THE PICTURE (listed for Hafsah in docs/pull-request.md):
 *  - the link is the check-in's own open link (/answer?t=...), which anyone can answer without an account; there is no short
 *    code typed in at /join for a check-in, so today's "Or share an access code instead" stays in its place;
 *  - "Who gets in", "Their role here" and "Works until" each have the one answer the product holds, said as a sentence;
 *  - "Make a new link and code", "Turn it off", "Choose another scenario", "Give someone access" and "Remind the admin" have no
 *    route, so they are not drawn.
 */
type Served = Extract<PeopleAndSetup, { view: 'lead' | 'admin' }>

const HOW_OFTEN: { key: string; label: string }[] = [
  { key: 'weekday', label: 'Every weekday' },
  { key: 'day', label: 'Every day' },
  { key: 'WEEKLY', label: 'Every week' },
  { key: 'FORTNIGHTLY', label: 'Every 2 weeks' },
  { key: 'MONTHLY', label: 'Every month' },
  { key: 'SEQUENTIAL', label: 'When I choose' },
  { key: 'ONE_TIME', label: 'Once' },
]

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

const STAGE_SAID = ['Not invited yet', 'Invited', 'Reached', 'Verified', 'First check-in done', 'Coming back']

const REMIND_CHOICES = [
  { key: '1', label: '1 day' },
  { key: '2', label: '2 days' },
  { key: '3', label: '3 days' },
  { key: '7', label: '7 days' },
]
const remindKeyOf = (stopped: boolean, days: number[]) => stopped ? 'never' : days.length === 1 && ['1', '2', '3', '7'].includes(String(days[0])) ? String(days[0]) : 'other'

export function PeopleAndSetupAsPictured(props: PeopleAndSetupProps) {
  const { ground, user, id, isInitiator, isOrgAdmin, viewerIsAParty, mySessionsDone, plannedSessions } = props
  const g: any = ground
  /* The direct morning (lib/the-direct-morning.tsx), from the check-in this page holds: no explanation of how Groundwork uses the setup. */
  const direct = isTheDirectMorningOn(g)
  const qc = useQueryClient()
  const canEditRunOrAdmin = typeof g?.mayChangeSetup === 'boolean' ? g.mayChangeSetup === true : (isInitiator || isOrgAdmin)
  const canEditLeadOnly = isInitiator
  const viewerIsInIt = isInitiator || viewerIsAParty
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

  /* ---------- the drafts: nothing applies until "Save changes" ---------- */
  const recordReminderDays: number[] = (g?.chaseAfterDays ?? [1]) as number[]
  const onRecord = useMemo(() => ({
    label: g?.label ?? '',
    kindOfWork: g?.kindOfWork ?? '',
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
  }), [g?.label, g?.kindOfWork, g?.chasingStopped, recordReminderDays.join(','), g?.tellTheLead, g?.overWhatsApp, g?.simplerWords, props.expectsUnblocking, props.peersVisible, props.contactHidden, g?.peopleWorkTogether, props.numbersShared, g?.reportSharesAt])
  const [draft, setDraft] = useState(onRecord)
  useEffect(() => { setDraft(onRecord) }, [onRecord])
  const [roles, setRoles] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof onRecord>(k: K, v: (typeof onRecord)[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const changedKeys = (Object.keys(onRecord) as (keyof typeof onRecord)[]).filter((k) => draft[k] !== onRecord[k] && !(k === 'remindOther' && draft.remind !== 'other'))
  const rolesChanged = Object.entries(roles).filter(([pid, v]) => v.trim() !== ((g?.participants ?? []).find((p: any) => p.id === pid)?.roleAsDescribed ?? '').trim())
  const startChanged = props.canOfferStartDate && props.startsAtDraft !== props.startsAtOnRecord
  /*
   * RELEASE 2: THE TYPE, CONFIRMED BY THE LEAD (the switchboard foundation). Served only where the organisation's Release 2 switch
   * is on and the scenario has types of its own; then the Kind of work row offers those types, as the B8 fee notes picture draws
   * them, with the one Groundwork read already chosen. Nothing is stored until the lead saves; saving stores her choice as
   * confirmed. Where it is not served, the row is today's kind of work, exactly as before.
   */
  const typeServed = page?.checkInType ?? null
  /* Release 4: the thirteen templates, offered to whoever may change the setup, only where the organisation has Release 4 on. */
  const templatesQ = useQuery({ queryKey: ['templates'], queryFn: groundsApi.templates, enabled: !!id, staleTime: 5 * 60_000, retry: false })
  const qcForTemplate = useQueryClient()
  const attachTemplate = useMutation({
    mutationFn: (template: string | null) => groundsApi.setTemplate(id, template),
    onSuccess: () => { qcForTemplate.invalidateQueries({ queryKey: ['ground', id] }); qcForTemplate.invalidateQueries({ queryKey: ['board', id] }); toast.success('Saved. The board and the check-ins follow the template now.') },
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

  const save = () => {
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
  const [numberFor, setNumberFor] = useState<string | null>(null)
  const roleRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const endsRef = useRef<HTMLInputElement | null>(null)
  const scrollToRow = (pid: string) => document.getElementById(`person-${pid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const fixIt = (pr: ASetupProblem) => {
    const p = participants.find((x) => x.id === pr.participantId)
    if (pr.fix === 'fix-the-address' && p) { props.setFixingEmailId(p.id); props.setFixingEmailValue(p.email ?? ''); scrollToRow(p.id) }
    if (pr.fix === 'add-a-number') { setNumberFor(pr.participantId); scrollToRow(pr.participantId) }
    if (pr.fix === 'add-their-role') { scrollToRow(pr.participantId); roleRefs.current[pr.participantId]?.focus() }
  }
  const FIX_SAID: Record<string, string> = { 'fix-the-address': 'Fix the address', 'add-a-number': 'Add a number', 'add-their-role': 'Add their role' }

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
    { key: 'whatever', label: `Whatever ${orgName} does (WhatsApp if they have a number)`, says: 'The default. People who have a number on their profile get it on WhatsApp; everybody else answers here.' },
    { key: 'on', label: 'On WhatsApp', says: 'The check-in, the reminders and the report go to their phone. They reply to the message and that reply is their answer.' },
    { key: 'in', label: 'In Groundwork only', says: 'This one stays here even though your organisation has a number. For a conversation you would rather was not on somebody’s phone.' },
  ]
  const nobodyElseAnswered = !(props.whoIsInThisParties ?? []).some((p) => p.done && !p.isSelf)
  const n = sessionsUpToTheEnd(props) ?? sessionsFor(props.timelineDaysDraft, props.cadenceDraft) ?? 1

  return (
    <div className="wrap gw-stack gwui-b-tab">
      {/* 1. HOW THIS CHECK-IN RUNS */}
      {/* B8: a small uppercase label, then the one line in Literata. */}
      <Panel as="section" aria-label="How this check-in runs">
        <Stack gap={8}>
          <h2 className="gwui-ci-prior-label gwui-m-0">How this check-in runs</h2>
          {page ? <p className="gwui-b8-line">{page.howItRuns}</p> : servedFailed ? <Note>This part of the page could not be loaded. Try again in a moment.</Note> : null}
          {(page?.problems ?? []).map((pr) => (
            <div key={`${pr.participantId}-${pr.fix}-${pr.says}`} className="gwui-setup-problem">
              <FlexRow gap={12} justify="space-between" align="center" wrap>
                <span>{pr.says}</span>
                {pr.fix && FIX_SAID[pr.fix] && <button type="button" className="gw-link t-small gw-bold" onClick={() => fixIt(pr)}>{FIX_SAID[pr.fix]}</button>}
                {pr.fix === 'let-them-in' && <Link className="gwui-open-link" to="/org/members">Let them in on People</Link>}
                {pr.fix === 'view-plans' && <Link className="gwui-open-link" to="/billing">View plans</Link>}
              </FlexRow>
            </div>
          ))}
        </Stack>
      </Panel>

      {/* 2. WHAT IT IS */}
      <Section heading="What it is">
        <Panel>
          {/* B8: the three fields side by side, each label above its field. */}
          <div className="gwui-three-fields">
            <AFieldWithItsLabel
              label="Name"
              value={canEditRunOrAdmin
                ? <TextField aria-label="Name" value={draft.label} onChange={(e) => set('label', e.target.value)} />
                : g?.label}
            />
            <AFieldWithItsLabel label="Scenario" value={g?.scenario ? scenarioLabel(g.scenario, g.brief) : 'Not set.'} />
            {typeServed ? (
            <AFieldWithItsLabel
              label="Kind of work"
              value={typeServed.mayConfirm
                ? (
                  <Select aria-label="Kind of work" value={typeDraft} onChange={(e) => setTypeDraft(e.target.value)}>
                    {!typeDraft && <option value="">Not known yet</option>}
                    {typeServed.offered.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                  </Select>
                )
                : (typeServed.offered.find((t) => t.type === typeServed.type)?.label ?? 'Nobody has said yet.')}
            />
            ) : (
            <AFieldWithItsLabel
              label="Kind of work"
              value={canEditRunOrAdmin && page
                ? (
                  <Select aria-label="Kind of work" value={draft.kindOfWork} onChange={(e) => set('kindOfWork', e.target.value)}>
                    <option value="">Not known yet</option>
                    {page.kindsOffered.map((k) => <option key={k} value={k}>{(KIND_OF_WORK_OPTION_LABEL as Record<string, string>)[k] ?? k}</option>)}
                  </Select>
                )
                : (g?.kindOfWork ? ((KIND_OF_WORK_OPTION_LABEL as Record<string, string>)[g.kindOfWork] ?? g.kindOfWork) : 'Nobody has said yet.')}
            />
            )}
          </div>
          {templatesQ.data?.on && (
            <div className="gw-mt-4">
              <AFieldWithItsLabel
                label="Template"
                value={canEditRunOrAdmin
                  ? (
                    <Select aria-label="Template" value={(g as any)?.templateId ?? ''} disabled={attachTemplate.isPending} onChange={(e) => attachTemplate.mutate(e.target.value || null)}>
                      <option value="">None</option>
                      {templatesQ.data.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                  )
                  : (templatesQ.data.templates.find((t) => t.id === (g as any)?.templateId)?.name ?? 'None')}
              />
              <Link to="/templates" className="t-small">See every template, and what each tracks</Link>
            </div>
          )}
          {typeServed && <Note>{typeServed.says}</Note>}
          {!direct && <Note>The scenario and kind of work decide the board, the reports, and what each check-in asks about.</Note>}
        </Panel>
      </Section>

      {/* 3. WHO'S IN IT */}
      <Section
        heading="Who's in it"
        note={whosInItSays(counted)}
        action={isInitiator ? (
          <FlexRow gap={8} wrap>
            {g?.joinToken && <Button kind="secondary" size="small" onClick={() => setShowLink((v) => !v)}>Join link and QR code</Button>}
            <Button size="small" onClick={() => setShowAdd((v) => !v)}>Add people</Button>
          </FlexRow>
        ) : undefined}
      >
        <Stack gap={12}>
          {isInitiator && showLink && g?.joinToken && (
            <TheJoinLink joinToken={g.joinToken} label={g.label} joined={page?.joinedWithTheLink ?? null} onShareCode={props.onShareCode} />
          )}
          {isInitiator && showAdd && (
            <AddPeopleForm
              isOrgAdmin={isOrgAdmin} colleagues={props.colleagues} participants={participants} seats={seats} seatsFull={seatsFull}
              addingMany={props.addingMany} addManyParticipants={props.addManyParticipants}
              newParticipantEmail={props.newParticipantEmail} setNewParticipantEmail={props.setNewParticipantEmail} newParticipantName={(props as any).newParticipantName} setNewParticipantName={(props as any).setNewParticipantName}
              newParticipantNote={props.newParticipantNote} setNewParticipantNote={props.setNewParticipantNote}
              newParticipantDepartment={props.newParticipantDepartment} setNewParticipantDepartment={props.setNewParticipantDepartment}
              addParticipantMut={props.addParticipantMut} queuedToAdd={props.queuedToAdd} setQueuedToAdd={props.setQueuedToAdd}
              inviteTheQueue={props.inviteTheQueue} lastInvitedEmail={props.lastInvitedEmail} whyItWaits={props.whyItWaits} lastInviteWaits={props.lastInviteWaits}
              onShareCode={props.onShareCode}
            />
          )}
          <PeopleTable>
            <PeopleTableHead extraColumns="minmax(170px, 1fr) 190px 210px" labels={['Person', 'Their role here', 'Phone number', 'Getting started']} />
            {[...participants].sort((a, b) => (a.userId === g?.initiatorId ? -1 : b.userId === g?.initiatorId ? 1 : 0)).map((p: any) => {
              const row = whereThisPersonIs(p, {
                ground: g, isInitiator, isOrgAdmin, isNotCounted, sessionParties: props.whoIsInThisParties, notOpenYet: props.whoIsInThisNotOpenYet,
                fixingEmailId: props.fixingEmailId, setFixingEmailId: props.setFixingEmailId, fixingEmailValue: props.fixingEmailValue,
                setFixingEmailValue: props.setFixingEmailValue, fixEmail: props.fixEmail, resendInvite: props.resendInvite,
              })
              const isLead = p.userId === g?.initiatorId
              const stage = ((started?.people ?? []) as { participantId: string; reached: number; says: string }[]).find((s) => s.participantId === p.id)
              const onWhatsApp = ((numbers ?? []) as any[]).find((x) => x.participantId === p.id)
              const phone = onWhatsApp?.phone ?? null
              const problem = row.statusText !== 'Checking in' && row.statusText !== 'Runs it'
              return (
                <div id={`person-${p.id}`} key={p.id}>
                  <PersonRow
                    extraColumns="minmax(170px, 1fr) 190px 210px"
                    /* The name, "Runs it" or "Checks in", and the address the invitation went to, as A4 draws it under every name
                       (restored, 30 October 2026: on hover only, nobody on a phone could read it). */
                    person={{ initials: initialsOf(row.name), name: row.name, level: isLead ? 'Runs it' : 'Checks in', email: p.userId ? p.email : undefined }}
                    help={row.help}
                  >
                    <span>
                      {isInitiator
                        ? <TextField
                            ref={(el: HTMLInputElement | null) => { roleRefs.current[p.id] = el }}
                            aria-label={`Their role here, for ${row.name}`}
                            placeholder="Nobody has described it yet"
                            value={roles[p.id] ?? p.roleAsDescribed ?? ''}
                            onChange={(e) => setRoles((r) => ({ ...r, [p.id]: e.target.value }))}
                          />
                        : (page?.roleDescribed?.[p.id] ? `${leadFirst.charAt(0).toUpperCase()}${leadFirst.slice(1)} has described it.` : 'Nobody has described it yet.')}
                    </span>
                    <span>
                      {numberFor === p.id
                        ? <TheirNumber groundId={id} participantId={p.id} name={row.name} phone={phone} onDone={() => setNumberFor(null)} />
                        : phone
                          ? <>{aNumberAsShown(phone)}{' '}<button type="button" className="gwui-plain-link" onClick={() => setNumberFor(p.id)}>Change</button>{props.whatsAppIsOn && onWhatsApp?.says ? <span className="gwui-note">{' '}{onWhatsApp.says}</span> : null}</>
                          : <>None yet{' '}<button type="button" className="gwui-plain-link" onClick={() => setNumberFor(p.id)}>Add a number</button></>}
                    </span>
                    <Stack gap={4}>
                      {stage && (
                        <span className="pb-rely-bars" aria-hidden="true">
                          {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= stage.reached ? 'on' : undefined} />)}
                        </span>
                      )}
                      <Tag tone={problem ? row.tone : 'proven'}>{problem || !stage ? row.statusText : STAGE_SAID[stage.reached]}</Tag>
                      {/* Where they are, their session and when they last did something, as one quiet line anyone can read, on a phone
                          too (restored, 30 October 2026: it was for screen readers and hover only). */}
                      {[stage?.says, row.sessionLine, row.when].some(Boolean) && <Text size="13" ink="sub" as="p">{[stage?.says, row.sessionLine, row.when].filter(Boolean).join(' ')}</Text>}
                    </Stack>
                  </PersonRow>
                </div>
              )
            })}
          </PeopleTable>
          <Note>
            Getting started goes from Invited, to Reached, to Verified, to First check-in, to Coming back. Their role here shapes
            the questions their check-in asks. Their role in your organisation is set in People.
          </Note>
          {props.whatsAppIsOn && <Note>Groundwork writes to each person on WhatsApp once their number is here, and they can answer there.</Note>}
          {!direct && (
          <Note>
            {props.whoIsInThisPeersHidden
              ? 'People on this check-in answer without seeing each other. You can see who is here.'
              : viewerIsAParty === false
                ? 'When everyone has checked in, the report shows where the team agrees, where it differs, and what to do next.'
                : 'When everyone has checked in, the report shows where you agree, where you differ, and what to do next.'}
          </Note>
          )}
        </Stack>
      </Section>

      {/* 4. WHEN IT RUNS */}
      <div id="how-long-this-runs" />
      <Section heading="When it runs">
        <Panel>
          <Stack gap={12}>
            {canEditRunOrAdmin ? (
              <>
                <FlexRow gap={12} wrap align="flex-start">
                  <Stack gap={4}>
                    <FieldLabel htmlFor="how-often">How often</FieldLabel>
                    <Select id="how-often" value={cadenceKey} onChange={(e) => chooseHowOften(e.target.value)}>
                      {HOW_OFTEN.map((h) => <option key={h.key} value={h.key}>{h.label}</option>)}
                    </Select>
                  </Stack>
                  <Stack gap={4}>
                    <FieldLabel htmlFor="starts">Starts</FieldLabel>
                    {props.canOfferStartDate
                      ? <TextField id="starts" type="date" value={props.startsAtDraft} onChange={(e) => props.setStartsAtDraft(e.target.value)} />
                      : <Text size="15" as="p">{whenItWas((g?.startsAt ?? g?.createdAt) as string, 'dayAndMonthLong')}</Text>}
                  </Stack>
                  <Stack gap={4}>
                    <FieldLabel htmlFor="ends">Ends</FieldLabel>
                    <TextField
                      id="ends" type="date" ref={endsRef}
                      value={theEndOnTheField(props.startsAtOnRecord, props.createdAtOnRecord, props.timelineDaysDraft)}
                      onChange={(e) => {
                        const from = props.startsAtOnRecord ? new Date(props.startsAtOnRecord) : props.createdAtOnRecord ? new Date(props.createdAtOnRecord) : new Date()
                        const days = Math.round((new Date(e.target.value).getTime() - from.getTime()) / 86_400_000)
                        if (Number.isFinite(days) && days >= 1) props.setTimelineDaysDraft(days)
                      }}
                    />
                  </Stack>
                  <Button kind="secondary" size="small" onClick={() => { endsRef.current?.focus(); endsRef.current?.showPicker?.() }}>Give it more time</Button>
                </FlexRow>
                {props.canOfferStartDate && (
                  <Note>Session 1 opens on the start day, and anybody you add before it is invited on it. Leave it empty to open the check-in as soon as people are added.</Note>
                )}
                {(cadenceKey === 'weekday' || cadenceKey === 'day') && (
                  <WhichDaysTheyWork value={props.workingDaysDraft} onChange={props.setWorkingDaysDraft} />
                )}
                {(props.cadenceDraft === 'WEEKLY' || props.cadenceDraft === 'FORTNIGHTLY' || props.cadenceDraft === 'MONTHLY') && (
                  <>
                    <AnchorDayPicker cadence={props.cadenceDraft} anchorDay={props.anchorDayDraft} onAnchorDay={props.setAnchorDayDraft} idPrefix="people-and-setup" />
                    <Folded summary="The days this team works">
                      <WhichDaysTheyWork value={props.workingDaysDraft} onChange={props.setWorkingDaysDraft} />
                    </Folded>
                  </>
                )}
              </>
            ) : (
              <FieldRows>
                <FieldRow label="How often" value={HOW_OFTEN.find((h) => h.key === howOftenKey(g?.cadence, g?.workingDays ?? []))?.label ?? ''} />
              </FieldRows>
            )}
            {page && <Text size="15" as="p">{page.sessions}{typeof g?.daysLeft === 'number' && g?.endsOn ? ` ${g.daysLeft} day${g.daysLeft === 1 ? '' : 's'} left.` : ''}</Text>}
            {props.theTimeframeChanged && (
              <Note>
                {`${props.timelineDaysDraft} days, ${n} session${n === 1 ? '' : 's'}.`}
                {(props.cadenceDraft === 'WEEKLY' || props.cadenceDraft === 'FORTNIGHTLY' || props.cadenceDraft === 'MONTHLY') && ' The day you choose applies from the next check-in on. A session already made keeps its own date.'}
              </Note>
            )}
            {viewerIsAParty && (
              <FieldRows>
                <FieldRow label="Your status" value={statusSentence(whatThisStatusMeans(g?.status))} />
                <FieldRow
                  label="Your sessions"
                  value={(participants.find((p) => p.userId === user?.id)?.managingOnly) ? 'You check in when you choose. Use Check in yourself any time.' : yourSessionsSentence(mySessionsDone, plannedSessions)}
                />
              </FieldRows>
            )}
            {canEditLeadOnly ? (
              <>
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
                    {!g?.chasingStopped && <Note>{chasingSentence(recordReminderDays)}</Note>}
                  </Stack>
                )}
                <SwitchRow look="checkbox" title="Tell me who never started" detail="A separate note to you when somebody has not opened it at all." on={draft.tellTheLead} onChange={(on) => set('tellTheLead', on)} />
              </>
            ) : (
              <FieldRows>
                <FieldRow label="Reminders" value={g?.chasingStopped ? 'Off. Nobody is reminded.' : chasingSentence(recordReminderDays)} />
              </FieldRows>
            )}
            <Note>Never more than one reminder a day. Quiet hours end at 7am. At the last session, everyone is asked how this should close.</Note>
          </Stack>
        </Panel>
      </Section>

      {/* 5. HOW PEOPLE ANSWER */}
      <Section heading="How people answer">
        <Panel>
          <FieldRows>
            <FieldRow
              label="Where"
              value={whatsAppHere && canEditRunOrAdmin
                ? (
                  <Stack gap={4}>
                    <Select aria-label="Where people answer" value={draft.where} onChange={(e) => set('where', e.target.value)}>
                      {WHERE.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
                    </Select>
                    <Note>{WHERE.find((w) => w.key === draft.where)?.says}</Note>
                  </Stack>
                )
                : whatsAppHere ? WHERE.find((w) => w.key === draft.where)?.label : 'In Groundwork only'}
            />
          </FieldRows>
          {canEditRunOrAdmin && (
            <SwitchRow look="checkbox" title="Use simpler words" detail="Short sentences and everyday words, in the check-in and everything sent afterwards" on={draft.simplerWords} onChange={(on) => set('simplerWords', on)} />
          )}
          <SwitchRow look="checkbox"
            title="When someone is blocked"
            detail="Ask what they’ve already tried, and offer ways through on their own report"
            on={draft.expectsUnblocking}
            onChange={(on) => set('expectsUnblocking', on)}
            disabled={!canEditRunOrAdmin}
          />
          <Note>
            {draft.expectsUnblocking
              ? `A blocker is recorded with what has already been done about it, and the person is offered ways through on their own report. ${isInitiator ? 'You see it too, as one thing to ask for.' : 'Their lead sees the same thing as one thing to ask for.'}`
              : 'What is in their way is recorded, and nothing is asked about what they tried. For people with no standing to chase anybody, or a check-in that is there to hear what happened.'}
          </Note>
        </Panel>
      </Section>

      {/* 6. STARTING POINT */}
      <Section heading="Starting point">
        <Stack gap={10}>
          <StartingPointPanel groundId={id} canRecord={isInitiator} />
          <Note>Recorded once, from your first session. It stays as written, and the board measures progress from it.</Note>
          {/* "What doing well looks like" is under About this work on References and resources now (Release 1B, pull request 2
              of 3), with its versions and wording; this page is drawn only where that tab is too. */}
        </Stack>
      </Section>

      {/* 7. WHO SEES WHAT */}
      <Section heading="Who sees what">
        <Panel>
          <FieldRows>
            <OneChoice
              label="Each other’s check-ins" canChange={canEditRunOrAdmin} value={draft.peersVisible ? 'named' : 'unnamed'}
              onChange={(v) => set('peersVisible', v === 'named')}
              options={[{ key: 'named', label: 'Seen once the team’s report is shared, with names' }, { key: 'unnamed', label: 'Seen once shared, without names' }]}
            />
            {g?.peersVisibleToEachOther == null && (
              <Note>{peersVisibilitySentence({ peersVisible: props.peersVisible, peersVisibleToEachOther: null, peersDefaultHidden: props.peersDefaultHidden, isInitiator, viewerIsInIt })}</Note>
            )}
            <OneChoice
              label="Email addresses" canChange={canEditLeadOnly} value={draft.contactHidden ? 'hidden' : 'visible'}
              onChange={(v) => set('contactHidden', v === 'hidden')}
              options={[{ key: 'hidden', label: 'Hidden from each other' }, { key: 'visible', label: 'Visible, so people can contact each other' }]}
            />
            <OneChoice
              label="Confirming each other’s work" canChange={canEditRunOrAdmin} value={draft.workTogether}
              onChange={(v) => set('workTogether', v)}
              options={[
                ...(draft.workTogether === '' ? [{ key: '', label: 'Not said yet, so it is assumed from the kind of check-in' }] : []),
                { key: 'yes', label: 'They see each other’s work day to day, so they can confirm it' },
                { key: 'no', label: 'They don’t see each other’s work' },
              ]}
            />
            <OneChoice
              label="Targets" canChange={canEditRunOrAdmin} value={draft.numbersShared ? 'shared' : 'own'}
              onChange={(v) => set('numbersShared', v === 'shared')}
              options={[{ key: 'shared', label: 'Each person sees their own share and the team’s total' }, { key: 'own', label: 'Each person sees only their own number' }]}
            />
            {g?.cadence !== 'ONE_TIME' && (
              <OneChoice
                label="The team’s report" canChange={canEditRunOrAdmin} value={draft.sharesAt}
                onChange={(v) => set('sharesAt', v)}
                options={[{ key: 'you', label: 'You share it when it’s ready' }, { key: 'self', label: `It shares itself at ${g?.reportSharesAt ? clock(g.reportSharesAt) : '6:30pm'}` }]}
              />
            )}
            <FieldRow
              label="The team’s report now"
              value={g?.report?.releasedAt
                ? `Shared on ${whenItWas(g.report.releasedAt, 'dayAndMonthLong')}.`
                : g?.status === 'REPORT_READY' ? 'The report is ready. It has not been shared yet.' : 'Not shared yet. Share it from the report when it is ready.'}
            />
            <FieldRow label="Others with access" value={page?.othersWithAccess ?? ''} />
          </FieldRows>
        </Panel>
      </Section>

      {/* 8. RECENT CHANGES */}
      <Section heading="Recent changes">
        <Stack gap={4}>
          {props.settingsChangeCount > 0
            ? [...(g?.settingsChanges ?? [])].reverse().map((c: any, i: number) => <Note key={i}>{settingsChangeSentence(c)}</Note>)
            : <Note>Changes to how long it runs and how often are noted with who made them and the date.</Note>}
        </Stack>
      </Section>

      {/* 9. ENDING */}
      <Panel as="section" aria-label="Ending it">
        {isInitiator ? (
          <Stack gap={10}>
            <FlexRow gap={12} justify="space-between" align="center" wrap>
              <Text size="15" as="p">
                {nobodyElseAnswered
                  ? 'Nobody else has answered yet, so this can still be deleted as a test. Otherwise, ending it stops new check-ins, everything stays as it is, and each person keeps their own history.'
                  : 'Ending it stops new check-ins. Everything stays as it is, and each person keeps their own history. This can’t be undone.'}
              </Text>
              <FlexRow gap={8} wrap>
                {nobodyElseAnswered && !props.confirmDelete && (
                  <Button kind="secondary" redText onClick={() => { props.setDeleteError(null); props.setConfirmDelete(true) }}>Delete this test</Button>
                )}
                <a className="btn sec red" href={`/grounds/${id}/end`}>Decide how it ends</a>
              </FlexRow>
            </FlexRow>
            {props.deleteError && <Note tone="error">{props.deleteError}</Note>}
            {nobodyElseAnswered && props.confirmDelete && (
              <FlexRow gap={8} wrap align="center">
                <span>Delete "{g?.label}" for good? Everything goes, including the conversation, the sessions and anything uploaded.</span>
                <Button kind="danger" disabled={props.removeGround.isPending} onClick={() => props.removeGround.mutate()}>
                  {props.removeGround.isPending ? 'Deleting…' : 'Yes, delete it'}
                </Button>
                <Button kind="secondary" onClick={() => { props.setConfirmDelete(false); props.setDeleteError(null) }}>Keep it</Button>
              </FlexRow>
            )}
          </Stack>
        ) : (
          <FlexRow gap={12} justify="space-between" align="center" wrap>
            <Text size="15" as="p">
              {`You can't end a check-in you don't run. Ask us and we'll end it, usually the same day.`}
              {isOrgAdmin && (props.whoIsInThisLeadName ? ` ${props.whoIsInThisLeadName} runs it, so ending it ends something they are running.` : ' Somebody else runs it, so ending it ends something they are running.')}
            </Text>
            <a className="btn sec red" href={`mailto:hello@myground.work?subject=Archive check-in: ${encodeURIComponent(g?.label ?? '')}`}>Ask us to end this check-in</a>
          </FlexRow>
        )}
      </Panel>

      {/* THE SAVE BAR: nothing applies until it is saved. */}
      {anyChange && (
        <div role="region" aria-label="Unsaved changes" style={{ position: 'sticky', bottom: 0, zIndex: 5 }}>
          <Panel>
            <FlexRow gap={12} justify="space-between" align="center" wrap>
              <Text size="15" as="p">You have changes. They apply from the next check-in. Sessions already done keep their dates.</Text>
              <FlexRow gap={8}>
                <Button kind="secondary" onClick={discard}>Discard</Button>
                <Button kind="secondary" onClick={save}>Save changes</Button>
              </FlexRow>
            </FlexRow>
          </Panel>
        </div>
      )}
    </div>
  )
}

function clock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h >= 12 ? 'pm' : 'am'}`
}

/** One "Who sees what" row: a choice for whoever may change it, the chosen answer as a sentence for anyone else. */
function OneChoice({ label, value, options, onChange, canChange }: {
  label: string
  value: string
  options: { key: string; label: string }[]
  onChange: (key: string) => void
  canChange: boolean
}) {
  return (
    <FieldRow
      label={label}
      value={canChange
        ? <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</Select>
        : (options.find((o) => o.key === value)?.label ?? '')}
    />
  )
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

/** One field of B8's "What it is" row: its label above it, small and quiet, then the field or the plain value. */
function AFieldWithItsLabel({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="gwui-field-with-label">
      <span className="gwui-b8-field-label">{label}</span>
      {typeof value === 'string' ? <Text size="15" as="p">{value}</Text> : value}
    </div>
  )
}
