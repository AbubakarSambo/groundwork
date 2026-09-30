import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { boardApi, KIND_OF_WORK_OPTIONS, type AServedWorkSection, type AServedWorkRow, type KindOfWork, type WorkItemInput } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { Section, Panel, Tag, Button, Modal, FieldLabel, TextField, TextArea, Select, StageTrack } from '@/components/gw/ui'
import { useAreYouSure, Confirm } from '@/components/gw/a-second-press-before-it-is-gone'
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

const dueSentence = (due: string | null) => (due ? `Due on ${whenItWas(due, 'dayAndMonthLong')}.` : null)

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
        <Button kind="quiet" size="small" onClick={() => setOpen(true)}>
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

/** One section's own add-or-change form: a record's name, kind, stage, owner and due date. */
function WorkItemForm({ section, participants, editing, onClose, onSaved }: {
  section: Extract<AServedWorkSection, { state: 'filled' | 'none-yet' }>
  participants: { id: string; name: string | null }[]
  editing: AServedWorkRow | null
  onClose: () => void
  onSaved: (dto: WorkItemInput) => void
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
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={submit} disabled={!name.trim()}>{editing ? 'Save the change' : 'Add it'}</Button>
          <Button kind="quiet" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * ONE ROW OF A KIND OF WORK'S RECORD (salesorg.txt: "Deal", "Rep", "Stage now", "What shows it").
 * What shows it is either the person's own words, quoted exactly as said, or, when the lead added
 * it themselves, said so plainly - never drawn as "proven", which nothing served here says.
 */
function WorkRow({ row, stages, leadFirstName, canEdit, onEdit, onRemove }: {
  row: AServedWorkRow
  stages?: string[]
  leadFirstName: string | null
  canEdit: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const fieldEntries = Object.entries(row.fields ?? {})
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr auto', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--gw-border)', alignItems: 'start' }} role="row">
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--gw-text)' }}>{row.name}</div>
        {row.owner && <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2 }}>{row.owner}</div>}
        {fieldEntries.map(([label, value]) => (
          <div key={label} style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2 }}>{label} {value}</div>
        ))}
        {dueSentence(row.due) && <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2 }}>{dueSentence(row.due)}</div>}
      </div>
      <div>
        {stages?.length
          ? <StageTrack stages={stages} current={row.stage} />
          : (row.stage
            ? <span style={{ fontSize: 13, color: 'var(--gw-text)' }}>{row.stage}</span>
            : <span style={{ fontSize: 13, color: 'var(--gw-muted)' }}>No stage said yet.</span>)}
      </div>
      <div>
        {row.from === 'said'
          ? (
            <>
              <Tag tone="plain">Someone's word</Tag>
              {row.said && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.5, fontStyle: 'italic' }}>“{row.said}”</p>}
            </>
          )
          : <Tag tone="plain">{`Added by ${leadFirstName ?? 'the person running this check-in'}`}</Tag>}
      </div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button kind="quiet" size="small" onClick={onEdit}>Change this record</Button>
          <Button kind="quiet" size="small" onClick={onRemove}>Remove this record</Button>
        </div>
      )}
    </div>
  )
}

/**
 * ONE SECTION OF THE KIND OF WORK'S RECORD, UNDER THE SWITCHBOARD'S OWN NAME ("Deal grid",
 * "Forecast", "Themes", "Work plan", "Timeline", "Obligations"). Drawn in one of three states -
 * `filled`, `none-yet` and `not-known` are told apart on screen, not only in the data (items 2
 * and 3): "none-yet" says Groundwork keeps this but nothing has come up, "not-known" says this is
 * not something Groundwork knows, in the server's own words, quieter.
 */
function WorkRecordSectionBlock({ groundId, section, participants, leadFirstName, canEdit }: {
  groundId: string
  section: AServedWorkSection
  participants: { id: string; name: string | null }[]
  leadFirstName: string | null
  canEdit: boolean
}) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['board', groundId] })
  const [adding, setAdding] = useState(false)
  const [editingRow, setEditingRow] = useState<AServedWorkRow | null>(null)
  const sureAboutRow = useAreYouSure<string>()

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
    onSuccess: () => { sureAboutRow.disarm(); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That record was not removed. Nothing has changed, so try again.'),
  })

  if (section.state === 'not-known') {
    return (
      <Section heading={section.section}>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gw-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>{section.why}</p>
      </Section>
    )
  }

  const canAdd = canEdit && !!ITEM_KINDS_FOR_HOLDS[section.holds]?.length

  if (section.state === 'none-yet') {
    return (
      <Section heading={section.section}>
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

  return (
    <Section heading={section.section} note={`All of the ${section.holds}, and what shows it.`}>
      <Panel pad={false}>
        <div role="table">
          {section.rows.map((row) => (
            <WorkRow
              key={row.id}
              row={row}
              stages={section.stages}
              leadFirstName={leadFirstName}
              canEdit={canEdit}
              onEdit={() => setEditingRow(row)}
              onRemove={() => sureAboutRow.arm(row.id)}
            />
          ))}
        </div>
      </Panel>
      {section.rows.map((row) => sureAboutRow.isArmed(row.id) && (
        <Confirm
          key={`confirm-${row.id}`}
          saying={`Remove "${row.name}" from this board? This cannot be undone.`}
          confirmLabel="Remove"
          keepLabel="Keep it"
          pending={removeItem.isPending}
          onConfirm={() => removeItem.mutate(row.id)}
          onKeep={() => sureAboutRow.disarm()}
        />
      ))}
      {canAdd && (
        <div style={{ marginTop: 10 }}>
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
 */
export function WorkRecordsSections({ groundId, sections, participants, leadFirstName, canEdit }: {
  groundId: string
  sections?: AServedWorkSection[]
  participants: { id: string; name: string | null }[]
  leadFirstName: string | null
  canEdit: boolean
}) {
  if (!sections?.length) return null
  return (
    <>
      {sections.map((s) => (
        <WorkRecordSectionBlock
          key={s.section}
          groundId={groundId}
          section={s}
          participants={participants}
          leadFirstName={leadFirstName}
          canEdit={canEdit}
        />
      ))}
    </>
  )
}
