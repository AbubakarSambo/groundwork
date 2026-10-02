import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { boardApi, KIND_OF_WORK_OPTIONS, type AServedWorkSection, type AServedWorkRow, type KindOfWork, type WorkItemInput } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { Section, Panel, RowList, Row, Tag, Button, Modal, FieldLabel, TextField, TextArea, Select, StageTrack, ProofMark, Stack, Note } from '@/components/gw/ui'
import { Confirm } from '@/components/gw/a-second-press-before-it-is-gone'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * THE KIND OF WORK, SAID AS A SENTENCE (request 76). The eleven names the server stores are short
 * labels, not sentences a person reads ("sales org", "MarketView Q4"); this says each of them the
 * way a lead would say it out loud. Written once here, so the banner and the "Change" form always
 * agree with each other.
 *
 * PRIMARY-BUTTONS-NEVER-TOGETHER: this file's two default-primary `<Button>`s (the kind-of-work
 * form's "Save", and the add/edit-record form's "Save"/"Add it") each sit inside its own `Modal`,
 * opened by a different quiet trigger ("Change"/"Choose" here, "Add a record" or a row's "Change"
 * in `WorkRecordRow` below). `Modal` renders as a full-screen overlay that blocks the page behind
 * it, and nothing here ever opens a second one while the first is still open, so only one of these
 * two can ever be on screen at once.
 */
const KIND_OF_WORK_SENTENCE: Record<KindOfWork, string> = {
  'sales org': "This check-in is about a sales team and its deals.",
  'engineering release': 'This check-in is about an engineering release.',
  'support desk': 'This check-in is about a support desk and its tickets.',
  'distribution operations': 'This check-in is about distribution operations.',
  'trader training programme': 'This check-in is about a trader training programme.',
  "founder's own check-in": "This is a founder's own check-in, about their own commitments and decisions.",
  'asset loans': 'This check-in is about asset loans and their repayments.',
  /* Re-review, 30 September: "MarketView" is an example company's name, not a plain word for the
     kind of work - the same fix already made to the chooser's own options, below. */
  'MarketView where next': 'This check-in is about choosing where to focus next.',
  'MarketView Q4': 'This check-in is about subscriptions, what was said and what was paid.',
  'a law firm matter': 'This check-in is about a law firm matter.',
  'a government programme': 'This check-in is about a government programme.',
}

/**
 * THE SAME ELEVEN NAMES, FOR THE CHOOSER'S OWN OPTIONS (board review, 30 September, item 4). The
 * chooser used to show the engine's internal names verbatim ("Sales org", "MarketView, where
 * next", "MarketView Q4") - a switchboard key, not something a person picking a kind of work reads.
 * Each option now says the same plain words as `KIND_OF_WORK_SENTENCE` above, just without the
 * "This check-in is about" lead-in a dropdown option does not need. The value the form actually
 * sends is still one of the engine's own eleven names (`KIND_OF_WORK_OPTIONS`) - only the label a
 * person reads changes.
 */
const KIND_OF_WORK_OPTION_LABEL: Record<KindOfWork, string> = {
  'sales org': 'A sales team and its deals',
  'engineering release': 'An engineering release',
  'support desk': 'A support desk and its tickets',
  'distribution operations': 'Distribution operations',
  'trader training programme': 'A trader training programme',
  "founder's own check-in": "A founder's own check-in, about their own commitments and decisions",
  'asset loans': 'Asset loans and their repayments',
  /* Second pass, 30 September: "MarketView" is an example company's name, not a plain word for
     the kind of work - a chooser option names the WORK, not which example company it came from. */
  'MarketView where next': 'Choosing where to focus next',
  'MarketView Q4': 'Subscriptions, said and paid',
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
  /* Board fix (sales B, item 1): the prototype's own board screen for this kind of work
     (docs/prototype/screens/B5-the-board/board-as-lead.txt, "Every deal, day by day") is the one
     this component actually draws for - WorkRecordsSections is only ever called from the Board
     page (BoardPage.tsx), never from the G1 example-check-ins screen the old heading quoted. */
  'sales org': 'Every deal, day by day',
  /* Phase 2 of the board task, 1 October: the prototype's own eng example
     (docs/prototype/screens/G1-example-check-ins/eng.txt) heads this table "Every task, and
     what shows it" - the same words every other kind uses, not "Every release and task". */
  'engineering release': 'Every task, and what shows it',
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

/**
 * THE DEAL GRID'S OWN SUBTITLE (board-as-lead.txt, directly under "Every deal, day by day":
 * "Grouped by what the proof says about closing this quarter"). Said once here so the heading's
 * `note` (Section's own slot for it) and the-prototype-count tests can't drift apart.
 */
const DEAL_GRID_NOTE: Partial<Record<KindOfWork, string>> = {
  'sales org': 'Grouped by what the proof says about closing this quarter.',
}

/**
 * THE DEAL GRID'S KEY (board-as-lead.txt, directly under its subtitle): what each mark means, and
 * what the "Next step" column's two states mean. The first two lines are the shared `ProofMark`
 * itself - filled for proof, ringed for someone's word (request 108 c) - so this key can never say
 * something different from what the dot beside a deal's name actually draws. The last two describe
 * the "Next step" column below, which carries no mark of its own.
 */
function DealGridKey() {
  return (
    <Stack gap={4}>
      <Note tone="muted"><ProofMark mark="proven" /> Contact with proof: a photo, a quote, a payment</Note>
      <Note tone="muted"><ProofMark mark="said" /> Contact in their words</Note>
      <Note tone="muted">Next step booked</Note>
      <Note tone="muted">Follow-up, no reply</Note>
    </Stack>
  )
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
  /* Board review, 30 September, item 3: this section's rows are loans, not traders - the column
     used to say "Trader", matching the section's OWNER label ("Owner" below), not what the row
     itself is. */
  'asset loans': 'Loan',
  'MarketView where next': 'Priority',
  'MarketView Q4': 'Subscription',
  'a law firm matter': 'Item',
  /* Board review, 30 September, item 3: this section holds counties AND their projects (kind
     "county" or "project" rows, side by side) - "County" alone was wrong for half the rows. */
  'a government programme': 'County or project',
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
    <div className="gwui-gap-10 gwui-mt-8" style={{display: 'flex', alignItems: 'baseline', flexWrap: 'wrap'}}>
      <p className="gwui-fs-15 gwui-ink-text" style={{lineHeight: 1.55}}>{sentence}</p>
      {canEdit && (
        <Button kind="quiet" size="small" onClick={() => setOpen(true)} aria-label={kindOfWork ? 'Change the kind of work' : 'Choose the kind of work'}>
          {kindOfWork ? 'Change' : 'Choose'}
        </Button>
      )}
      {open && (
        <Modal title="What kind of work is this check-in about?" onClose={() => setOpen(false)}>
          <div className="gwui-gap-14" style={{display: 'flex', flexDirection: 'column'}}>
            <div>
              <FieldLabel htmlFor="kind-of-work-select">Kind of work</FieldLabel>
              <Select id="kind-of-work-select" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">Not known yet</option>
                {KIND_OF_WORK_OPTIONS.map((k) => <option key={k} value={k}>{KIND_OF_WORK_OPTION_LABEL[k]}</option>)}
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
            <div className="gwui-gap-8" style={{display: 'flex'}}>
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
 * Added by the lead is plain text too: "You added it." to the lead who added it, "Rukia added it."
 * to everybody else.
 *
 * BOARD REVIEW, 30 SEPTEMBER, ITEM 1: THE READER IS "YOU". Two bugs here, both about calling the
 * reader by name instead of "you": "Rukia added it." shown to Rukia herself (fixed with
 * `readerIsLead`, since the lead is the only one who adds a record); and "In Amani's words," which
 * guessed the speaker FROM THE OWNER FIELD - `row.owner` is whose the record is, not who said it in
 * their check-in, and a record about Amani's deal can just as easily have been said by somebody
 * else.
 *
 * REQUEST 89, ANSWERED: `AServedWorkRow` now carries `saidBy`, separate from `owner` - the person's
 * first name, "a colleague" (lower case, to sit inside "In ...'s words") where this reader may not
 * be told who, or null for a record the lead added. "In the words of someone in this check-in," was
 * this screen's own stand-in for the missing field and is gone now that the field exists; a "said"
 * row with no `saidBy` at all (an older server) still falls back to it, so nothing breaks mid-rollout.
 */
function WhatShowsIt({ row, leadFirstName, readerIsLead }: { row: AServedWorkRow; leadFirstName: string | null; readerIsLead: boolean }) {
  if (row.from === 'lead') {
    const addedBy = readerIsLead ? 'You' : (leadFirstName ?? 'The person running this check-in')
    return <p className="gwui-fs-13 gwui-ink-sub" style={{lineHeight: 1.5}}>{`${addedBy} added it.`}</p>
  }
  const saidBy = row.saidBy?.trim()
  return (
    <div className="gwui-fs-13 gwui-ink-sub" style={{lineHeight: 1.5}}>
      <div>{saidBy ? `In ${saidBy}'s words,` : 'In the words of someone in this check-in,'}</div>
      {row.said && <p className="gwui-mt-2" style={{fontStyle: 'italic'}}>{`“${row.said}”`}</p>}
    </div>
  )
}

/**
 * REQUEST 107 (c), part 1: THE RECORD'S OWN "NEXT" (board-as-lead.txt: "Next: Send the quote,
 * with a photo"). Only an open commitment whose words name this exact record - drawn as the
 * server's own sentence (`nextSays`), never a bare "Next:" label with nothing behind it.
 */
function WhatsNext({ row }: { row: AServedWorkRow }) {
  const says = (row as any).nextSays as string | undefined
  if (!says) return null
  return <p className="gwui-panel-text-muted">{says}</p>
}

/**
 * THE DEAL GRID'S OWN "NEXT STEP" COLUMN (board-as-lead.txt: "Next step" heading, then each row's
 * own "Send the quote, with a photo" / "Nothing booked"). `nextSays` is never empty (the server's
 * own fallback, what-happens-next-to-a-record.ts: "Nobody has said what happens next."), but the
 * prototype's own word for that exact case is "Nothing booked" - said here only then.
 */
const NOTHING_HAS_BEEN_SAID = 'Nobody has said what happens next.'
function NextStepCell({ row }: { row: AServedWorkRow }) {
  const says = row.nextSays
  const booked = !!says && says !== NOTHING_HAS_BEEN_SAID
  return <p className="gwui-panel-text">{booked ? says : 'Nothing booked'}</p>
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
      <div className="gwui-gap-14" style={{display: 'flex', flexDirection: 'column'}}>
        {kinds.length > 1 && (
          <div>
            <FieldLabel htmlFor="work-item-kind">What kind of record is this?</FieldLabel>
            <Select id="work-item-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
              {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </Select>
          </div>
        )}
        <div>
          <FieldLabel htmlFor="work-item-name">What is it called?</FieldLabel>
          <TextField id="work-item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Its name, as you would say it" />
        </div>
        {!!section.stages?.length && (
          <div>
            <FieldLabel htmlFor="work-item-stage">Which stage is it at?</FieldLabel>
            <Select id="work-item-stage" value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">No stage said yet</option>
              {section.stages.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        )}
        <div>
          <FieldLabel htmlFor="work-item-owner">Whose is it?</FieldLabel>
          <Select id="work-item-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">Nobody in particular</option>
            {participants.filter((p) => p.name?.trim()).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="work-item-due">When is it due? Leave this empty if there is no date.</FieldLabel>
          <TextField id="work-item-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div>
          {/* Board review, 30 September, item 5: two field labels for what is, on the page, one
              plain question - "A detail's label (optional)" and "Its value" as pieces, not
              sentences. One label now covers the pair (a name for the detail, and what it is). */}
          <FieldLabel htmlFor="work-item-field-label">Anything else to note, such as its value</FieldLabel>
          <div className="gwui-gap-10" style={{display: 'flex'}}>
            <div style={{flex: 1}}>
              <TextField id="work-item-field-label" value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} placeholder="e.g. Amount" aria-label="What to call this detail" />
            </div>
            <div style={{flex: 1}}>
              <TextField id="work-item-field-value" value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} placeholder="e.g. KES 90,000" aria-label="What it is" />
            </div>
          </div>
        </div>
        <div className="gwui-gap-8" style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap'}}>
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
/** The word this kind uses for "nobody" in the owner column, at phone width, where the column
    names are hidden and a bare "Nobody named yet." no longer says whose it is (item 3, item 6). */
const NOBODY_SENTENCE_FOR_KIND: Record<KindOfWork, string> = {
  'sales org': 'No rep is named yet.',
  'engineering release': 'No owner is named yet.',
  'support desk': 'No agent is named yet.',
  'distribution operations': 'No owner is named yet.',
  'trader training programme': 'No officer is named yet.',
  "founder's own check-in": 'No owner is named yet.',
  'asset loans': 'No owner is named yet.',
  'MarketView where next': 'No owner is named yet.',
  'MarketView Q4': 'No owner is named yet.',
  'a law firm matter': 'No owner is named yet.',
  'a government programme': 'No owner is named yet.',
}

function WorkRow({ row, leadFirstName, readerIsLead, kindOfWork, hasStageColumn, canEdit, onEdit, hasNextColumn }: {
  row: AServedWorkRow
  leadFirstName: string | null
  readerIsLead: boolean
  kindOfWork: KindOfWork | null
  /** Whether this section's rows carry a stage, or (the founder's own check-in) a kind, at all. */
  hasStageColumn: boolean
  canEdit: boolean
  onEdit: () => void
  /** The sales deal grid's own "Next step" column (board-as-lead.txt), drawn instead of folding
      the same sentence inside "What shows it" (`WhatsNext`, still used by every other kind). */
  hasNextColumn?: boolean
}) {
  const fieldEntries = Object.entries(row.fields ?? {})
  const isFounder = kindOfWork === "founder's own check-in"
  /* Board review, 30 September, item 3: the founder IS the owner of their own check-in, so an
     unnamed row there reads "You", never "Nobody named yet." - there is nobody else it could be. */
  const nobody = isFounder ? 'You' : (NOBODY_SENTENCE_FOR_KIND[kindOfWork ?? 'sales org'] ?? 'Nobody named yet.')
  return (
    <div
      className={`gwui-work-row gwui-gap-14 gwui-pt-12 gwui-pr-16 gwui-pb-12 gwui-pl-16 gwui-rule-top${hasStageColumn ? '' : ' gwui-work-row-nostage'}`}
      style={hasNextColumn ? NEXT_COLUMN_TEMPLATE : undefined}
      role="row"
      aria-label={row.name}
    >
      <div>
        <div className="gwui-ink-text gwui-fs-16" style={{fontWeight: 700}}>
          {/* REQUEST 108 (c): the line's own mark - filled for proven, ringed for the rest,
              nothing for a record added on the board with nothing behind it ("none"). */}
          {(row as any).mark && (row as any).mark !== 'none' && (
            <><ProofMark mark={(row as any).mark} />{' '}</>
          )}
          {row.name}
        </div>
        {fieldEntries.map(([label, value]) => (
          /* Board review, 30 September, item 3: a detail read as a label and a bare value stuck
             together ("Amount KES 45,000") - now a sentence ("The amount is KES 45,000."). */
          <div key={label} className="gwui-fs-13-5 gwui-ink-sub gwui-mt-2">{`The ${label.toLowerCase()} is ${value}.`}</div>
        ))}
        {dueSentence(row.due) && <div className="gwui-fs-13-5 gwui-ink-sub gwui-mt-2">{dueSentence(row.due)}</div>}
      </div>
      <div className="gwui-fs-15 gwui-ink-text">
        {row.owner ?? (
          isFounder
            /* The founder is always the owner of their own check-in, on every width - "You" is
               never ambiguous, so it needs no narrow/wide pair. */
            ? <span className="gwui-ink-muted">You</span>
            : (
              <span className="gwui-ink-muted">
                <span className="gwui-nobody-wide">Nobody named yet.</span>
                <span className="gwui-nobody-narrow">{nobody}</span>
              </span>
            )
        )}
      </div>
      {hasStageColumn && (
        isFounder
          ? <div aria-label="Kind"><Tag tone="plain">{row.kind === 'decision' ? 'Decision' : 'Commitment'}</Tag></div>
          : (
            <div aria-label="Stage now">
              {row.stage
                ? <Tag tone="plain">{row.stage}</Tag>
                : <span className="gwui-fs-13-5 gwui-ink-muted">No stage said yet.</span>}
            </div>
          )
      )}
      <div>
        <Stack gap={4}>
          <WhatShowsIt row={row} leadFirstName={leadFirstName} readerIsLead={readerIsLead} />
          {!hasNextColumn && <WhatsNext row={row} />}
        </Stack>
      </div>
      {hasNextColumn && (
        <div aria-label="Next step">
          <NextStepCell row={row} />
        </div>
      )}
      {canEdit && (
        <div>
          <Button kind="quiet" size="small" onClick={onEdit}>Change</Button>
        </div>
      )}
    </div>
  )
}

/** The column headings above the rows - the item's own noun, the kind's own word for whose it is.
    A kind with no stages carries no "Stage now" column at all (item 3); the founder's own
    check-in has no stages either, but keeps that slot for "Kind" (Commitment or Decision). */
/* BOARD FIX (sales B, item 1): the deal grid's extra "Next step" column (board-as-lead.txt) needs a
   sixth grid track that none of the other ten kinds of work carry. Rather than a new one-off class
   for one column count, the extra track is added by inline style, on top of the shared class's own
   `grid-template-columns` - the same approach this file already uses throughout for one-off
   layout, never a second CSS class. */
const NEXT_COLUMN_TEMPLATE = { gridTemplateColumns: '1.3fr 0.8fr 0.8fr 1.4fr 1.3fr auto' }

function WorkTableHead({ itemNoun, ownerLabel, hasStageColumn, isFounder, canEdit, hasNextColumn }: {
  itemNoun: string
  ownerLabel: string
  hasStageColumn: boolean
  isFounder: boolean
  canEdit: boolean
  hasNextColumn?: boolean
}) {
  return (
    <div
      className={`gwui-work-head gwui-gap-14 gwui-pt-10 gwui-pr-16 gwui-pb-10 gwui-pl-16 gwui-fs-13 gwui-ink-sub${hasStageColumn ? '' : ' gwui-work-head-nostage'}`}
      style={hasNextColumn ? NEXT_COLUMN_TEMPLATE : undefined}
      role="row"
    >
      <span>{itemNoun}</span>
      <span>{ownerLabel}</span>
      {hasStageColumn && <span>{isFounder ? 'Kind' : 'Stage now'}</span>}
      <span>What shows it</span>
      {hasNextColumn && <span>Next step</span>}
      {canEdit && <span />}
    </div>
  )
}

/** Every deadline, in date order, with its date in words (matter.txt: "Our reply is due on Friday 2 October"). */
function TimelineList({ rows, canEdit, leadFirstName, readerIsLead, onEdit }: {
  rows: AServedWorkRow[]
  canEdit: boolean
  leadFirstName: string | null
  readerIsLead: boolean
  onEdit: (row: AServedWorkRow) => void
}) {
  const ordered = [...rows].sort((a, b) => {
    if (!a.due) return 1
    if (!b.due) return -1
    return a.due.localeCompare(b.due)
  })
  return (
    <Panel pad={false}>
      <RowList label="Every deadline">
        {ordered.map((row) => (
          <Row key={row.id} columns="1fr" inset="record">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}} role="row" aria-label={row.name}>
              <div>
                <p className="gwui-ink-text gwui-fs-15">
                  {row.due ? `${row.name} is due on ${whenItWas(row.due, 'weekdayAndDay')}.` : `${row.name}. No date said yet.`}
                </p>
                <div className="gwui-mt-4"><WhatShowsIt row={row} leadFirstName={leadFirstName} readerIsLead={readerIsLead} /></div>
              </div>
              {canEdit && <Button kind="quiet" size="small" onClick={() => onEdit(row)}>Change</Button>}
            </div>
          </Row>
        ))}
      </RowList>
    </Panel>
  )
}

/** The parties, as a plain list (the prototype's own shape - a name, and what shows it). */
/** The first letter up, so a value typed as "the other side" reads as a sentence. */
function atTheStartOf(t: string): string { return t ? t[0].toUpperCase() + t.slice(1) : t }

function PartiesList({ rows, canEdit, leadFirstName, readerIsLead, onEdit }: {
  rows: AServedWorkRow[]
  canEdit: boolean
  leadFirstName: string | null
  readerIsLead: boolean
  onEdit: (row: AServedWorkRow) => void
}) {
  return (
    <Panel pad={false}>
      <RowList label="The parties">
        {rows.map((row) => (
          <Row key={row.id} columns="1fr" inset="record">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}} role="row" aria-label={row.name}>
              <div>
                <p className="gwui-ink-text gwui-fs-16" style={{fontWeight: 700}}>{row.name}</p>
                {/* What the record says about this party, as the prototype does ("Pwani Mills, the other side"): each field's value, in words. */}
                {Object.values(row.fields ?? {}).filter(Boolean).length > 0 && (
                  <p className="gwui-mt-2 gwui-fs-15 gwui-ink-sub">{atTheStartOf(Object.values(row.fields ?? {}).filter(Boolean).join('. '))}.</p>
                )}
                <div className="gwui-mt-4"><WhatShowsIt row={row} leadFirstName={leadFirstName} readerIsLead={readerIsLead} /></div>
              </div>
              {canEdit && <Button kind="quiet" size="small" onClick={() => onEdit(row)}>Change</Button>}
            </div>
          </Row>
        ))}
      </RowList>
    </Panel>
  )
}

/**
 * "WHERE NEXT, RANKED" (item 3): the prototype's own shape for MarketView's priorities
 * (mvnext.txt) is a plain ranked list, not a table with "Stage now" and "Owner" columns that
 * mean nothing for a priority nobody owns and nothing stages. Each row is numbered in the order
 * the server serves it (its rank), with whatever the server sends about it under "From how many
 * said it, and who" - drawn only from `row.fields`, nothing invented.
 */
function ThemesList({ rows, canEdit, leadFirstName, readerIsLead, onEdit }: {
  rows: AServedWorkRow[]
  canEdit: boolean
  leadFirstName: string | null
  readerIsLead: boolean
  onEdit: (row: AServedWorkRow) => void
}) {
  return (
    <Panel pad={false}>
      <RowList label="Where next, ranked">
        {rows.map((row, i) => {
          const details = Object.values(row.fields ?? {}).filter(Boolean)
          return (
            <Row key={row.id} columns="1fr" inset="record">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}} role="row" aria-label={row.name}>
                <div>
                  <p className="gwui-ink-text gwui-fs-16" style={{fontWeight: 700}}>{`${i + 1}. ${row.name}`}</p>
                  {details.length > 0 && (
                    <div className="gwui-mt-4">
                      <div className="gwui-fs-13 gwui-ink-muted">From how many said it, and who</div>
                      {details.map((v, di) => <div key={di} className="gwui-fs-15 gwui-ink-sub gwui-mt-2">{v}</div>)}
                    </div>
                  )}
                  <div className="gwui-mt-4"><WhatShowsIt row={row} leadFirstName={leadFirstName} readerIsLead={readerIsLead} /></div>
                </div>
                {canEdit && <Button kind="quiet" size="small" onClick={() => onEdit(row)}>Change</Button>}
              </div>
            </Row>
          )
        })}
      </RowList>
    </Panel>
  )
}

/**
 * ONE SECTION OF THE KIND OF WORK'S RECORD, UNDER ITS OWN, PLAIN HEADING (item 1) - "none-yet" and
 * "not-known" told apart on screen (items 2 and 3): "none-yet" says Groundwork keeps this but
 * nothing has come up, "not-known" says this is not something Groundwork knows, in the server's own
 * words, quieter.
 */
function WorkRecordSectionBlock({ groundId, kindOfWork, section, participants, leadFirstName, readerIsLead, canEdit }: {
  groundId: string
  kindOfWork: KindOfWork | null
  section: AServedWorkSection
  participants: { id: string; name: string | null }[]
  leadFirstName: string | null
  readerIsLead: boolean
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
  const isDealGrid = section.section === 'Deal grid'
  const note = (isDealGrid && kindOfWork ? DEAL_GRID_NOTE[kindOfWork] : undefined) ?? undefined

  if (section.state === 'not-known') {
    return (
      <Section heading={heading} note={note}>
        <p className="gwui-fs-13-5 gwui-ink-muted" style={{fontStyle: 'italic', lineHeight: 1.5}}>{section.why}</p>
      </Section>
    )
  }

  const canAdd = canEdit && !!ITEM_KINDS_FOR_HOLDS[section.holds]?.length

  if (section.state === 'none-yet') {
    return (
      <Section heading={heading} note={note}>
        <p className="gwui-ink-sub gwui-fs-15" style={{lineHeight: 1.55}}>
          {`No ${section.holds} have come up yet. They appear here when someone names one in a check-in${canAdd ? ', or when you add one below.' : '.'}`}
        </p>
        {canAdd && (
          <div className="gwui-mt-10">
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
  const isThemes = section.section === 'Themes' && kindOfWork === 'MarketView where next'
  const isFounder = kindOfWork === "founder's own check-in"
  /* A kind with no stages has no "Stage now" column at all (item 3) - except the founder's own
     check-in, which has no stages either but keeps that slot for "Kind" (Commitment/Decision). */
  const hasStageColumn = !!section.stages?.length || isFounder
  const itemNoun = kindOfWork ? ITEM_NOUN_FOR_KIND[kindOfWork] : 'Item'
  const ownerLabel = kindOfWork ? OWNER_LABEL_FOR_KIND[kindOfWork] : 'Owner'
  const stageCounts: Record<string, number> = {}
  if (section.stages?.length) {
    for (const row of section.rows) if (row.stage) stageCounts[row.stage] = (stageCounts[row.stage] ?? 0) + 1
  }

  const showDealGridKey = isDealGrid && kindOfWork === 'sales org'
  const dealGridContent = isTimeline ? (
        <TimelineList rows={section.rows} canEdit={canEdit} leadFirstName={leadFirstName} readerIsLead={readerIsLead} onEdit={setEditingRow} />
      ) : isObligations ? (
        <PartiesList rows={section.rows} canEdit={canEdit} leadFirstName={leadFirstName} readerIsLead={readerIsLead} onEdit={setEditingRow} />
      ) : isThemes ? (
        <ThemesList rows={section.rows} canEdit={canEdit} leadFirstName={leadFirstName} readerIsLead={readerIsLead} onEdit={setEditingRow} />
      ) : (
        <Panel pad={false}>
          <div role="table" aria-label={heading}>
            <WorkTableHead itemNoun={itemNoun} ownerLabel={ownerLabel} hasStageColumn={hasStageColumn} isFounder={isFounder} canEdit={canEdit} hasNextColumn={showDealGridKey} />
            {section.rows.map((row) => (
              <WorkRow
                key={row.id}
                row={row}
                leadFirstName={leadFirstName}
                readerIsLead={readerIsLead}
                kindOfWork={kindOfWork}
                hasStageColumn={hasStageColumn}
                canEdit={canEdit}
                onEdit={() => setEditingRow(row)}
                hasNextColumn={showDealGridKey}
              />
            ))}
          </div>
        </Panel>
      )

  return (
    <Section heading={heading} note={note}>
      {showDealGridKey ? <Stack gap={12}><DealGridKey />{dealGridContent}</Stack> : dealGridContent}

      {!!section.stages?.length && (
        <div className="gwui-mt-14">
          <p className="gwui-mb-8 gwui-fs-16 gwui-ink-text" style={{fontWeight: 700}}>The shape of the work</p>
          <StageTrack stages={section.stages} counts={stageCounts} itemNoun={itemNoun} />
        </div>
      )}

      {canAdd && (
        <div className="gwui-mt-14">
          {/* Board review, 1 October, item 8: this only opens the form below (a fold) - the real
              mutation is that form's own submit button, which stays a real button. A boxed
              secondary button here counted as a second control for one action. */}
          <button onClick={() => setAdding(true)} className="gwui-plain-link gwui-fs-13-5">Add a record</button>
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
 * YOUR OWN RECORDS, DAY BY DAY - ONLY YOURS (B5's board-as-participant.txt: "Your deals, day by
 * day / Only yours"). The participant's own personal view leads with this: not the whole kind-of-
 * work record every reader already gets further down (`WorkRecordsSections`, unchanged, still
 * there for everybody inside "The whole check-in"), but just the rows this one reader owns,
 * pulled out and named as theirs. Draws nothing the server did not already send in `workRecords`;
 * only filters it down to `row.ownerParticipantId === myParticipantId`.
 */
export function YourOwnRecordsSections({ kindOfWork, sections, myParticipantId, leadFirstName }: {
  kindOfWork?: KindOfWork | null
  sections?: AServedWorkSection[]
  myParticipantId: string | null
  leadFirstName: string | null
}) {
  if (!sections?.length || !myParticipantId) return null
  const itemNoun = (kindOfWork ? ITEM_NOUN_FOR_KIND[kindOfWork] : 'Item').toLowerCase()
  const mine = sections
    .filter((s): s is Extract<AServedWorkSection, { state: 'filled' | 'none-yet' }> => s.state !== 'not-known')
    .flatMap((s) => (s.rows ?? []).filter((r) => r.ownerParticipantId === myParticipantId))
  if (!mine.length) return null
  return (
    <Section heading={`Your own ${itemNoun}s, day by day`} note="Only yours.">
      <Panel pad={false}>
        <RowList label={`Your own ${itemNoun}s, day by day`}>
          {mine.map((row) => (
            <Row key={row.id} columns="1fr" inset="record">
              <div>
                <div className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700 }}>{row.name}</div>
                {row.stage && <div className="gwui-mt-2"><Tag tone="plain">{row.stage}</Tag></div>}
                {dueSentence(row.due) && <div className="gwui-fs-13-5 gwui-ink-sub gwui-mt-2">{dueSentence(row.due)}</div>}
                <div className="gwui-mt-4"><WhatShowsIt row={row} leadFirstName={leadFirstName} readerIsLead={false} /></div>
              </div>
            </Row>
          ))}
        </RowList>
      </Panel>
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
export function WorkRecordsSections({ groundId, kindOfWork, sections, participants, leadFirstName, readerIsLead, canEdit }: {
  groundId: string
  kindOfWork?: KindOfWork | null
  sections?: AServedWorkSection[]
  participants: { id: string; name: string | null }[]
  leadFirstName: string | null
  readerIsLead: boolean
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
          readerIsLead={readerIsLead}
          canEdit={canEdit}
        />
      ))}
    </div>
  )
}
