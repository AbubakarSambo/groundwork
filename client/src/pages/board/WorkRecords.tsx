import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { boardApi, KIND_OF_WORK_OPTIONS, type AServedWorkSection, type AServedWorkRow, type KindOfWork, type WorkItemInput } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { Section, Panel, Tag, Button, Modal, FieldLabel, TextField, TextArea, Select, StageTrack } from '@/components/gw/ui'
import { Confirm } from '@/components/gw/a-second-press-before-it-is-gone'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * THE KIND OF WORK, SAID AS A SENTENCE (request 76). The eleven names the server stores are short
 * labels, not sentences a person reads ("sales org", "MarketView Q4"); this says each of them the
 * way a lead would say it out loud. Written once here, so the banner and the "Change" form always
 * agree with each other.
 */
const KIND_OF_WORK_SENTENCE: Record<KindOfWork, string> = {
  'sales org': "This check-in is about a sales team and its deals.",
  'engineering release': 'This check-in is about an engineering release.',
  'support desk': 'This check-in is about a support desk and its tickets.',
  'distribution operations': 'This check-in is about distribution operations.',
  'trader training programme': 'This check-in is about a trader training programme.',
  "founder's own check-in": "This is a founder's own check-in, about their own commitments and decisions.",
  'asset loans': 'This check-in is about asset loans and their repayments.',
  'MarketView where next': 'This check-in is about MarketView, choosing where to focus next.',
  'MarketView Q4': "This check-in is about MarketView's Q4 numbers.",
  'a law firm matter': 'This check-in is about a law firm matter.',
  'a government programme': 'This check-in is about a government programme.',
}

/** The same eleven names, for a select option's own label (plain words, not the sentence). */
const KIND_OF_WORK_LABEL: Record<KindOfWork, string> = {
  'sales org': 'Sales org',
  'engineering release': 'Engineering release',
  'support desk': 'Support desk',
  'distribution operations': 'Distribution operations',
  'trader training programme': 'Trader training programme',
  "founder's own check-in": "Founder's own check-in",
  'asset loans': 'Asset loans',
  'MarketView where next': 'MarketView, where next',
  'MarketView Q4': 'MarketView Q4',
  'a law firm matter': 'A law firm matter',
  'a government programme': 'A government programme',
}

/**
 * WHAT A RECORD OF EACH SECTION IS, AND WHICH `WorkItem.kind` VALUES IT ACCEPTS. Mirrors
 * api/src/modules/board/the-kind-of-work.ts's `RECORDS_FOR_EACH_KIND` (engine-owned; not changed
 * here), keyed by the section's own `holds` sentence, which the server already sends verbatim - see
 * the-kind-of-works-records-are-not-invented-here.spec.ts, which checks every entry below is still
 * in that file's own words.
 */
const ITEM_KINDS_FOR_HOLDS: Record<string, { value: string; label: string }[]> = {
  'deals': [{ value: 'deal', label: 'Deal' }],
  'releases and tasks': [{ value: 'release', label: 'Release' }, { value: 'task', label: 'Task' }],
  'tickets': [{ value: 'ticket', label: 'Ticket' }],
  'incidents': [{ value: 'incident', label: 'Incident' }],
  'trader groups': [{ value: 'group', label: 'Trader group' }],
  'commitments and decisions': [{ value: 'commitment', label: 'Commitment' }, { value: 'decision', label: 'Decision' }],
  'loans and their repayments': [{ value: 'loan', label: 'Loan' }],
  'priorities people named': [{ value: 'priority', label: 'Priority' }],
  'subscriptions': [{ value: 'subscription', label: 'Subscription' }],
  'deadlines': [{ value: 'deadline', label: 'Deadline' }],
  'the parties': [{ value: 'party', label: 'Party' }],
  'counties and their projects': [{ value: 'county', label: 'County' }, { value: 'project', label: 'Project' }],
}

/**
 * THE PROTOTYPE'S OWN HEADING FOR "Deal grid", "Work plan" and "Themes", where it has one, read
 * from docs/prototype/screens/G1-example-check-ins/<kind>.txt where it names what the rows are (salesorg
 * "Every sale, and what shows it", support "Every ticket...", mvnext "Where next, ranked"); otherwise
 * the same shape, naming what the engine says the section holds, so a heading never names something
 * other than the rows under it (ops's rows are incidents, loans' are loans, and so on). Where the prototype has none for this kind (MarketView Q4,
 * a government programme), a plain heading in the same "Every <the row's own name>, and what shows
 * it" shape, built from the section's own item noun - never a second, competing sentence glued onto
 * `holds` (that produced "All of the the parties" when `holds` was already "the parties").
 */
const DEAL_GRID_HEADING: Partial<Record<KindOfWork, string>> = {
  'sales org': 'Every sale, and what shows it',
  'engineering release': 'Every release and task, and what shows it',
  'support desk': 'Every ticket, and what shows it',
  'distribution operations': 'Every incident, and what shows it',
  'trader training programme': 'Every trader group, and what shows it',
  'asset loans': 'Every loan, and what shows it',
  'MarketView Q4': 'Every subscription, and what shows it',
  'a government programme': 'Every county, and what shows it',
}
const WORK_PLAN_HEADING: Partial<Record<KindOfWork, string>> = {
  "founder's own check-in": 'Every commitment and decision, and what shows it',
}
const THEMES_HEADING: Partial<Record<KindOfWork, string>> = {
  'MarketView where next': 'Where next, ranked',
}

/** The word for one row's kind, at the head of its own column ("Deal", "Task", "Item", "Trader"...). */
const ITEM_NOUN_FOR_KIND: Record<KindOfWork, string> = {
  'sales org': 'Deal',
  'engineering release': 'Task',
  'support desk': 'Ticket',
  'distribution operations': 'Incident',
  'trader training programme': 'Group',
  "founder's own check-in": 'Item',
  'asset loans': 'Trader',
  'MarketView where next': 'Priority',
  'MarketView Q4': 'Subscription',
  'a law firm matter': 'Item',
  'a government programme': 'County',
}

/** The word for whose it is, at the head of the owner column ("Rep" for sales, "Agent" for support desk...). */
const OWNER_LABEL_FOR_KIND: Record<KindOfWork, string> = {
  'sales org': 'Rep',
  'engineering release': 'Owner',
  'support desk': 'Agent',
  'distribution operations': 'Owner',
  'trader training programme': 'Officer',
  "founder's own check-in": 'Owner',
  'asset loans': 'Owner',
  'MarketView where next': 'Owner',
  'MarketView Q4': 'Owner',
  'a law firm matter': 'Owner',
  'a government programme': 'Owner',
}

/** The section's own heading, a person can actually read - never the switchboard's internal name. */
function sectionHeading(kindOfWork: KindOfWork | null, section: AServedWorkSection): string {
  if (section.section === 'Timeline') return 'Every deadline'
  if (section.section === 'Obligations') return 'The parties'
  const byKind = kindOfWork
    ? (section.section === 'Deal grid' ? DEAL_GRID_HEADING[kindOfWork]
      : section.section === 'Work plan' ? WORK_PLAN_HEADING[kindOfWork]
        : section.section === 'Themes' ? THEMES_HEADING[kindOfWork]
          : undefined)
    : undefined
  if (byKind) return byKind
  /* Not-known sections, and Themes/Forecast sections with no heading of their own: the server's
     own `holds` is already a plain sentence fragment ("ticket volume and causes from the
     helpdesk"), so it becomes the heading rather than a second, glued-together sentence. */
  if (section.holds) return section.holds.charAt(0).toUpperCase() + section.holds.slice(1)
  return section.section
}

const dueSentence = (due: string | null) => (due ? `Due on ${whenItWas(due, 'dayAndMonthLong')}.` : null)
const firstWord = (s: string) => s.trim().split(' ')[0]

/**
 * THE KIND OF WORK, NEAR THE TOP OF THE BOARD (item 4). One plain sentence, said once. The lead, or
 * an admin of this organisation, can change it and its stage names; a participant reads it and
 * cannot change it. A name the server refuses is shown exactly as it says it.
 */
export function KindOfWorkBanner({ groundId, kindOfWork, workStages, canEdit }: {
  groundId: string
  kindOfWork: KindOfWork | null
  workStages?: string[] | null
  canEdit: boolean
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<string>(kindOfWork ?? '')
  const [stagesText, setStagesText] = useState((workStages ?? []).join('\n'))

  const save = useMutation({
    mutationFn: () => groundsApi.setKindOfWork(groundId, {
      kind: kind || null,
      stages: stagesText.trim() ? stagesText.split('\n').map((s) => s.trim()).filter(Boolean) : null,
    }),
    onSuccess: () => {
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['board', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. Nothing has changed, so try again.'),
  })

  const sentence = kindOfWork
    ? KIND_OF_WORK_SENTENCE[kindOfWork]
    : (canEdit
      ? 'Nobody has said what kind of work this check-in is about yet. Choose one, so its board can keep the right kind of record.'
      : 'Nobody has said what kind of work this check-in is about yet.')

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', margin: '8px 0 0' }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.55 }}>{sentence}</p>
      {canEdit && (
        <Button kind="quiet" size="small" onClick={() => setOpen(true)} aria-label={kindOfWork ? 'Change the kind of work' : 'Choose the kind of work'}>
          {kindOfWork ? 'Change' : 'Choose'}
        </Button>
      )}
      {open && (
        <Modal title="What kind of work is this check-in about?" onClose={() => setOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <FieldLabel htmlFor="kind-of-work-select">Kind of work</FieldLabel>
              <Select id="kind-of-work-select" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">Not known yet</option>
                {KIND_OF_WORK_OPTIONS.map((k) => <option key={k} value={k}>{KIND_OF_WORK_LABEL[k]}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="kind-of-work-stages">Your own names for its stages, one per line (leave empty to use the usual ones)</FieldLabel>
              <TextArea
                id="kind-of-work-stages"
                rows={4}
                value={stagesText}
                onChange={(e) => setStagesText(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
              <Button kind="quiet" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/**
 * ONE RECORD'S "WHAT SHOWS IT" (item 6): the person's own words, in their own name, never a colon
 * join and never drawn as a status tag - "In Amani's words," on its own line, the quote below it.
 * Added by the lead is plain text too: "Rukia added it."
 */
function WhatShowsIt({ row, leadFirstName }: { row: AServedWorkRow; leadFirstName: string | null }) {
  if (row.from === 'lead') {
    return <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{`${leadFirstName ?? 'The person running this check-in'} added it.`}</p>
  }
  const who = row.owner ? firstWord(row.owner) : null
  return (
    <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
      <div>{who ? `In ${who}'s words,` : 'In their own words,'}</div>
      {row.said && <p style={{ margin: '2px 0 0', fontStyle: 'italic' }}>{`“${row.said}”`}</p>}
    </div>
  )
}

/** One row's add-or-change form: a record's name, kind, stage, owner and due date. Remove sits inside it, behind a confirmation. */
function WorkItemForm({ section, participants, editing, onClose, onSaved, onRemove, removing }: {
  section: Extract<AServedWorkSection, { state: 'filled' | 'none-yet' }>
  participants: { id: string; name: string | null }[]
  editing: AServedWorkRow | null
  onClose: () => void
  onSaved: (dto: WorkItemInput) => void
  onRemove?: () => void
  removing?: boolean
}) {
  const kinds = ITEM_KINDS_FOR_HOLDS[section.holds] ?? []
  const [kind, setKind] = useState(editing?.kind ?? kinds[0]?.value ?? '')
  const [name, setName] = useState(editing?.name ?? '')
  const [stage, setStage] = useState(editing?.stage ?? '')
  const [owner, setOwner] = useState(editing?.ownerParticipantId ?? '')
  const [due, setDue] = useState(editing?.due ?? '')
  const firstField = Object.entries(editing?.fields ?? {})[0]
  const [fieldLabel, setFieldLabel] = useState(firstField?.[0] ?? '')
  const [fieldValue, setFieldValue] = useState(firstField?.[1] ?? '')
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const submit = () => {
    const dto: WorkItemInput = {
      ...(kinds.length ? { kind } : {}),
      name: name.trim(),
      stage: stage || null,
      ownerParticipantId: owner || null,
      due: due || null,
      fields: fieldLabel.trim() && fieldValue.trim() ? { [fieldLabel.trim()]: fieldValue.trim() } : {},
    }
    onSaved(dto)
  }

  return (
    <Modal title={editing ? 'Change this record' : `Add ${section.holds === 'the parties' ? 'a party' : 'a record'}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {kinds.length > 1 && (
          <div>
            <FieldLabel htmlFor="work-item-kind">What kind of record is this?</FieldLabel>
            <Select id="work-item-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
              {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </Select>
          </div>
        )}
        <div>
          <FieldLabel htmlFor="work-item-name">Name</FieldLabel>
          <TextField id="work-item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Its name, as you would say it" />
        </div>
        {!!section.stages?.length && (
          <div>
            <FieldLabel htmlFor="work-item-stage">Stage</FieldLabel>
            <Select id="work-item-stage" value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">No stage said yet</option>
              {section.stages.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        )}
        <div>
          <FieldLabel htmlFor="work-item-owner">Whose is it</FieldLabel>
          <Select id="work-item-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">Nobody in particular</option>
            {participants.filter((p) => p.name?.trim()).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="work-item-due">Due date (leave empty for none)</FieldLabel>
          <TextField id="work-item-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel htmlFor="work-item-field-label">A detail's label (optional)</FieldLabel>
            <TextField id="work-item-field-label" value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} placeholder="Value" />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel htmlFor="work-item-field-value">Its value</FieldLabel>
            <TextField id="work-item-field-value" value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} placeholder="KES 90,000" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button onClick={submit} disabled={!name.trim()}>{editing ? 'Save the change' : 'Add it'}</Button>
          <Button kind="quiet" onClick={onClose}>Cancel</Button>
          {editing && onRemove && (
            <Button kind="danger" onClick={() => setConfirmingRemove(true)}>Remove this record</Button>
          )}
        </div>
        {confirmingRemove && onRemove && (
          <Confirm
            saying={`Remove "${editing?.name}" from this board? This cannot be undone.`}
            confirmLabel="Remove"
            keepLabel="Keep it"
            pending={!!removing}
            onConfirm={onRemove}
            onKeep={() => setConfirmingRemove(false)}
          />
        )}
      </div>
    </Modal>
  )
}

/**
 * ONE ROW, AS THE PROTOTYPE'S OWN TABLE DRAWS IT (salesorg.txt: "Deal", "Rep", "Stage now", "What
 * shows it"). One stage now, not the whole track (the track is drawn once for the section, in
 * `WorkRecordSectionBlock`); the owner in its own column, "Nobody named yet" when there is none; a
 * single quiet "Change" opens the form, where "Remove" lives, behind its own confirmation.
 */
function WorkRow({ row, leadFirstName, canEdit, onEdit }: {
  row: AServedWorkRow
  leadFirstName: string | null
  canEdit: boolean
  onEdit: () => void
}) {
  const fieldEntries = Object.entries(row.fields ?? {})
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.8fr auto', gap: 14, padding: '12px 16px', borderTop: '1px solid var(--gw-border)', alignItems: 'start' }}
      role="row"
      aria-label={row.name}
    >
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--gw-text)' }}>{row.name}</div>
        {fieldEntries.map(([label, value]) => (
          <div key={label} style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2 }}>{label} {value}</div>
        ))}
        {dueSentence(row.due) && <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2 }}>{dueSentence(row.due)}</div>}
      </div>
      <div style={{ fontSize: 13, color: 'var(--gw-text)' }}>
        {row.owner ?? <span style={{ color: 'var(--gw-muted)' }}>Nobody named yet.</span>}
      </div>
      <div aria-label="Stage now">
        {row.stage
          ? <Tag tone="plain">{row.stage}</Tag>
          : <span style={{ fontSize: 12.5, color: 'var(--gw-muted)' }}>No stage said yet.</span>}
      </div>
      <div>
        <WhatShowsIt row={row} leadFirstName={leadFirstName} />
      </div>
      {canEdit && (
        <div>
          <Button kind="quiet" size="small" onClick={onEdit}>Change</Button>
        </div>
      )}
    </div>
  )
}

/** The column headings above the rows - the item's own noun, the kind's own word for whose it is. */
function WorkTableHead({ itemNoun, ownerLabel, canEdit }: { itemNoun: string; ownerLabel: string; canEdit: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.8fr auto', gap: 14, padding: '10px 16px', fontSize: 12.5, color: 'var(--gw-sub)' }} role="row">
      <span>{itemNoun}</span>
      <span>{ownerLabel}</span>
      <span>Stage now</span>
      <span>What shows it</span>
      {canEdit && <span />}
    </div>
  )
}

/** Every deadline, in date order, with its date in words (matter.txt: "Our reply is due on Friday 2 October"). */
function TimelineList({ rows, canEdit, leadFirstName, onEdit }: {
  rows: AServedWorkRow[]
  canEdit: boolean
  leadFirstName: string | null
  onEdit: (row: AServedWorkRow) => void
}) {
  const ordered = [...rows].sort((a, b) => {
    if (!a.due) return 1
    if (!b.due) return -1
    return a.due.localeCompare(b.due)
  })
  return (
    <Panel pad={false}>
      {ordered.map((row) => (
        <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '12px 16px', borderTop: '1px solid var(--gw-border)', alignItems: 'flex-start' }} role="row" aria-label={row.name}>
          <div>
            <p style={{ margin: 0, fontSize: 14.5, color: 'var(--gw-text)' }}>
              {row.due ? `${row.name} is due on ${whenItWas(row.due, 'weekdayAndDay')}.` : `${row.name}. No date said yet.`}
            </p>
            <div style={{ marginTop: 4 }}><WhatShowsIt row={row} leadFirstName={leadFirstName} /></div>
          </div>
          {canEdit && <Button kind="quiet" size="small" onClick={() => onEdit(row)}>Change</Button>}
        </div>
      ))}
    </Panel>
  )
}

/** The parties, as a plain list (the prototype's own shape - a name, and what shows it). */
/** The first letter up, so a value typed as "the other side" reads as a sentence. */
function atTheStartOf(t: string): string { return t ? t[0].toUpperCase() + t.slice(1) : t }

function PartiesList({ rows, canEdit, leadFirstName, onEdit }: {
  rows: AServedWorkRow[]
  canEdit: boolean
  leadFirstName: string | null
  onEdit: (row: AServedWorkRow) => void
}) {
  return (
    <Panel pad={false}>
      {rows.map((row) => (
        <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '12px 16px', borderTop: '1px solid var(--gw-border)', alignItems: 'flex-start' }} role="row" aria-label={row.name}>
          <div>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--gw-text)' }}>{row.name}</p>
            {/* What the record says about this party, as the prototype does ("Pwani Mills, the other side"): each field's value, in words. */}
            {Object.values(row.fields ?? {}).filter(Boolean).length > 0 && (
              <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--gw-sub)' }}>{atTheStartOf(Object.values(row.fields ?? {}).filter(Boolean).join('. '))}.</p>
            )}
            <div style={{ marginTop: 4 }}><WhatShowsIt row={row} leadFirstName={leadFirstName} /></div>
          </div>
          {canEdit && <Button kind="quiet" size="small" onClick={() => onEdit(row)}>Change</Button>}
        </div>
      ))}
    </Panel>
  )
}

/**
 * ONE SECTION OF THE KIND OF WORK'S RECORD, UNDER ITS OWN, PLAIN HEADING (item 1) - "none-yet" and
 * "not-known" told apart on screen (items 2 and 3): "none-yet" says Groundwork keeps this but
 * nothing has come up, "not-known" says this is not something Groundwork knows, in the server's own
 * words, quieter.
 */
function WorkRecordSectionBlock({ groundId, kindOfWork, section, participants, leadFirstName, canEdit }: {
  groundId: string
  kindOfWork: KindOfWork | null
  section: AServedWorkSection
  participants: { id: string; name: string | null }[]
  leadFirstName: string | null
  canEdit: boolean
}) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['board', groundId] })
  const [adding, setAdding] = useState(false)
  const [editingRow, setEditingRow] = useState<AServedWorkRow | null>(null)

  const addItem = useMutation({
    mutationFn: (dto: WorkItemInput) => boardApi.addWorkItem(groundId, dto),
    onSuccess: () => { setAdding(false); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That record was not added. What you typed is still here, so try again.'),
  })
  const updateItem = useMutation({
    mutationFn: (v: { itemId: string; dto: WorkItemInput }) => boardApi.updateWorkItem(groundId, v.itemId, v.dto),
    onSuccess: () => { setEditingRow(null); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That change was not saved. Nothing has changed, so try again.'),
  })
  const removeItem = useMutation({
    mutationFn: (itemId: string) => boardApi.deleteWorkItem(groundId, itemId),
    onSuccess: () => { setEditingRow(null); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That record was not removed. Nothing has changed, so try again.'),
  })

  const heading = sectionHeading(kindOfWork, section)

  if (section.state === 'not-known') {
    return (
      <Section heading={heading}>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gw-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>{section.why}</p>
      </Section>
    )
  }

  const canAdd = canEdit && !!ITEM_KINDS_FOR_HOLDS[section.holds]?.length

  if (section.state === 'none-yet') {
    return (
      <Section heading={heading}>
        <p style={{ margin: 0, fontSize: 14.5, color: 'var(--gw-sub)', lineHeight: 1.55 }}>
          {`No ${section.holds} have come up yet. They appear here when someone names one in a check-in${canAdd ? ', or when you add one below.' : '.'}`}
        </p>
        {canAdd && (
          <div style={{ marginTop: 10 }}>
            <Button kind="secondary" size="small" onClick={() => setAdding(true)}>Add one</Button>
          </div>
        )}
        {adding && (
          <WorkItemForm
            section={section}
            participants={participants}
            editing={null}
            onClose={() => setAdding(false)}
            onSaved={(dto) => addItem.mutate(dto)}
          />
        )}
      </Section>
    )
  }

  const isTimeline = section.section === 'Timeline'
  const isObligations = section.section === 'Obligations'
  const itemNoun = kindOfWork ? ITEM_NOUN_FOR_KIND[kindOfWork] : 'Item'
  const ownerLabel = kindOfWork ? OWNER_LABEL_FOR_KIND[kindOfWork] : 'Owner'
  const stageCounts: Record<string, number> = {}
  if (section.stages?.length) {
    for (const row of section.rows) if (row.stage) stageCounts[row.stage] = (stageCounts[row.stage] ?? 0) + 1
  }

  return (
    <Section heading={heading}>
      {isTimeline ? (
        <TimelineList rows={section.rows} canEdit={canEdit} leadFirstName={leadFirstName} onEdit={setEditingRow} />
      ) : isObligations ? (
        <PartiesList rows={section.rows} canEdit={canEdit} leadFirstName={leadFirstName} onEdit={setEditingRow} />
      ) : (
        <Panel pad={false}>
          <div role="table" aria-label={heading}>
            <WorkTableHead itemNoun={itemNoun} ownerLabel={ownerLabel} canEdit={canEdit} />
            {section.rows.map((row) => (
              <WorkRow
                key={row.id}
                row={row}
                leadFirstName={leadFirstName}
                canEdit={canEdit}
                onEdit={() => setEditingRow(row)}
              />
            ))}
          </div>
        </Panel>
      )}

      {!!section.stages?.length && (
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 700, color: 'var(--gw-text)' }}>The shape of the work</p>
          <StageTrack stages={section.stages} counts={stageCounts} />
        </div>
      )}

      {canAdd && (
        <div style={{ marginTop: 14 }}>
          <Button kind="secondary" size="small" onClick={() => setAdding(true)}>Add a record</Button>
        </div>
      )}
      {adding && (
        <WorkItemForm
          section={section}
          participants={participants}
          editing={null}
          onClose={() => setAdding(false)}
          onSaved={(dto) => addItem.mutate(dto)}
        />
      )}
      {editingRow && (
        <WorkItemForm
          section={section}
          participants={participants}
          editing={editingRow}
          onClose={() => setEditingRow(null)}
          onSaved={(dto) => updateItem.mutate({ itemId: editingRow.id, dto })}
          onRemove={canEdit ? () => removeItem.mutate(editingRow.id) : undefined}
          removing={removeItem.isPending}
        />
      )}
    </Section>
  )
}

/**
 * EVERY SECTION THE KIND OF WORK KEEPS (item 1, 2, 3 and 6). Renders exactly what
 * `board.workRecords` sends, in the order the server gives it, and adds nothing of its own -
 * including when `kindOfWork` is `null`, where the server already sends every section as
 * "not-known" (item 6) and this draws them exactly as it would any other not-known section.
 *
 * Wrapped in `gwui-page-wrap` (item 5) for the 30px rhythm between sections the rest of the
 * rebuilt pages already use - `Section` itself carries no spacing of its own, so without this a
 * button at the foot of one section sits flush against the next section's heading.
 */
export function WorkRecordsSections({ groundId, kindOfWork, sections, participants, leadFirstName, canEdit }: {
  groundId: string
  kindOfWork?: KindOfWork | null
  sections?: AServedWorkSection[]
  participants: { id: string; name: string | null }[]
  leadFirstName: string | null
  canEdit: boolean
}) {
  if (!sections?.length) return null
  return (
    <div className="gwui-page-wrap">
      {sections.map((s) => (
        <WorkRecordSectionBlock
          key={s.section}
          groundId={groundId}
          kindOfWork={kindOfWork ?? null}
          section={s}
          participants={participants}
          leadFirstName={leadFirstName}
          canEdit={canEdit}
        />
      ))}
    </div>
  )
}
