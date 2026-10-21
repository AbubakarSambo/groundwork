import { ItsEvidence } from '@/components/gw/ItsEvidence'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { useIsAPhone } from '@/lib/a-phone-is-not-a-narrow-desktop'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { boardApi, KIND_OF_WORK_OPTIONS, type AServedWorkSection, type AServedWorkRow, type KindOfWork, type WorkItemInput } from '@/api/board'
import { isASalesKind } from '@/lib/a-sales-kind'
import { groundsApi } from '@/api/grounds'
import { Link } from 'react-router-dom'
import { Section, Panel, RowList, Row, Tag, Button, Modal, FieldLabel, TextField, TextArea, Select, StageTrack, ProofMark, Stack, Note, SubHeading, Folded } from '@/components/gw/ui'
import { Confirm } from '@/components/gw/a-second-press-before-it-is-gone'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { useTheDirectMorning } from '@/lib/the-direct-morning'

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
  'sales team': 'This check-in is about a sales team and its deals.',
  'sales org': 'This check-in is about a sales organisation of several teams, and its deals.',
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
export const KIND_OF_WORK_OPTION_LABEL: Record<KindOfWork, string> = {
  'sales team': 'One sales team and its deals',
  'sales org': 'A sales organisation of several teams, and its deals',
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
  'sales team': 'Every deal, day by day',
  'sales org': 'Every deal, day by day',
  /* Phase 2 of the board task, 1 October: the prototype's own eng example
     (docs/prototype/screens/G1-example-check-ins/eng.txt) heads this table "Every task, and
     what shows it" - the same words every other kind uses, not "Every release and task". */
  'engineering release': 'Every task, and what shows it',
  'support desk': 'Every ticket, and what shows it',
  'distribution operations': 'Every incident, and what shows it',
  /* Programme board review 1, item 3: programme.txt's own heading for this table is "Every
     trader, and what shows it" - not "Every trader group", which named the record's own item
     kind (`group`) rather than what the prototype actually says a lead reads here. */
  'trader training programme': 'Every trader, and what shows it',
  /* Request 133: loans.txt's own heading for this table is "Every trader, and what shows it" -
     named after who the cohort is (traders), the same words the trader training programme uses,
     not the record's own item kind (`loan`). The "Loan" column itself is untouched. */
  'asset loans': 'Every trader, and what shows it',
  'MarketView Q4': 'Every subscription, and what shows it',
  'a government programme': 'Every county, and what shows it',
}
const WORK_PLAN_HEADING: Partial<Record<KindOfWork, string>> = {
  /* THE FOUNDER'S OWN CHECK-IN BOARD (founder.txt): the prototype's own heading for this table is
     "Every item, and what shows it" - the same words every other kind uses (see
     `DEAL_GRID_HEADING`, above), not "Every commitment and decision", which named the record's
     own item kinds rather than what founder.txt actually reads here. */
  "founder's own check-in": 'Every item, and what shows it',
}

/**
 * THE DEAL GRID'S OWN SUBTITLE (board-as-lead.txt, directly under "Every deal, day by day":
 * "Grouped by what the proof says about closing this quarter"). Said once here so the heading's
 * `note` (Section's own slot for it) and the-prototype-count tests can't drift apart.
 */
const DEAL_GRID_NOTE: Partial<Record<KindOfWork, string>> = {
  'sales team': 'Grouped by what the proof says about closing this quarter.',
  'sales org': 'Grouped by what the proof says about closing this quarter.',
}

/**
 * THE DEAL GRID'S KEY (board-as-lead.txt, directly under its subtitle), one line of marks - the
 * prototype's own shape, a row of short phrases rather than a stacked list.
 *
 * BOARD REVIEW, SALES PIECE C, ITEM 3 (b): ONLY A MARK THE GRID CAN ACTUALLY DRAW. This used to
 * list four things - the two `ProofMark`s below, which `WorkRow` really draws beside a deal's
 * name, and "Next step booked" / "Follow-up, no reply", which named two states of the "Next step"
 * column but gave neither any mark of its own; the column is plain text (`NextStepCell`), and
 * nothing on this grid draws a mark for either state. A key that lists a mark nothing on the grid
 * shows promises something the page does not keep. Left out until the grid actually draws one -
 * see the task note, docs/morning-report.md.
 *
 * BOARD REVIEW, SALES PIECE D, ITEM 3: THE SAME RULE, ONE MARK AT A TIME. Each line is still only
 * a promise about what the grid draws, so it reads only when some row on THIS grid actually
 * carries that mark - a sales org whose every deal was added by hand, with nothing proven and
 * nothing said, drew both lines of a key for marks nobody has. When neither mark is on any row,
 * there is nothing to explain, so no key is drawn at all.
 */
function DealGridKey({ rows, behindInfo }: { rows: AServedWorkRow[]; behindInfo?: boolean }) {
  const hasProven = rows.some((r) => r.mark === 'proven')
  const hasSaid = rows.some((r) => r.mark === 'said')
  if (!hasProven && !hasSaid) return null
  const key = (
    <div className="gwui-gap-16" style={{ display: 'flex', flexWrap: 'wrap' }}>
      {hasProven && <Note tone="muted"><ProofMark mark="proven" /> Contact with proof: a photo, a quote, a payment</Note>}
      {hasSaid && <Note tone="muted"><ProofMark mark="said" /> Contact in their words</Note>}
    </div>
  )
  /* The light sales board, for a team member (sales-first.md, section 1): the same key, one tap away behind ⓘ. */
  if (!behindInfo) return key
  return (
    <details className="gwui-key-info">
      <summary aria-label="What the marks mean">ⓘ</summary>
      <div className="gwui-key-info-body">{key}</div>
    </details>
  )
}
const THEMES_HEADING: Partial<Record<KindOfWork, string>> = {
  'MarketView where next': 'Where next, ranked',
  /* Support desk board fix 2: support.txt's own heading, right after "The team today". */
  'support desk': 'The shape of the work',
  /* Distribution operations board: ops.txt's own heading, right after "The team today". */
  'distribution operations': 'The shape of the work',
}

/**
 * THE SUPPORT DESK'S OWN NOTE FOR "THE SHAPE OF THE WORK" (support.txt, directly under its
 * heading: "Volume from the helpdesk, causes from the check-ins"). Said once here, the same way
 * `DEAL_GRID_NOTE` already does for the deal grid's own subtitle.
 */
const THEMES_NOTE: Partial<Record<KindOfWork, string>> = {
  'support desk': 'Volume from the helpdesk, causes from the check-ins.',
  'distribution operations': 'Incidents by site and type, last 8 weeks.',
}

/** The word for one row's kind, at the head of its own column ("Deal", "Task", "Item", "Trader"...). */
const ITEM_NOUN_FOR_KIND: Record<KindOfWork, string> = {
  'sales team': 'Deal',
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
  'sales team': 'Rep',
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

/**
 * The section's own heading, a person can actually read - never the switchboard's internal name.
 * Exported (onboarding board fix 4) so BoardPage.tsx can tell whether a not-known `workRecords`
 * entry's heading is the same words as a switchboard section it is about to draw filled, rather
 * than guessing from the raw `section` name, which does not always match what is actually printed
 * (a not-known "Timeline" reads "Every deadline", never "Timeline").
 */
export function sectionHeading(kindOfWork: KindOfWork | null, section: AServedWorkSection): string {
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
 * PROJECT BOARD REVIEW 1, FIX 9: "NO RELEASES OR TASKS HAVE COME UP YET.", NOT "AND". The
 * engineering kind's `holds` ("releases and tasks") is a plain label joining the two item kinds it
 * covers - right as a heading, but read inside "No {holds} have come up yet.", "and" says neither
 * has come up only together, where the true meaning is that neither has come up at all: "or" is
 * the correct word. A small, named exception rather than a general rule, so every other kind's own
 * "No ... have come up yet." sentence (e.g. "commitments and decisions") is unchanged.
 */
const NONE_YET_HOLDS_SAYS: Record<string, string> = {
  'releases and tasks': 'releases or tasks',
}
/*
 * LAW FIRM MATTER BOARD, FIX 4: "NONE OF THE THE PARTIES SO FAR IS YOURS." The engine's own
 * `holds` for the parties section is sent as "the parties" (api/src/modules/board/
 * the-kind-of-work.ts), which reads right as a heading ("The parties") but doubles the article
 * once it sits inside "None of the {holds} so far is yours." or "No {holds} have come up yet." A
 * leading "the " is stripped here, at render time, rather than in the engine's own field - no
 * other kind's `holds` starts with "the ", so every other sentence is unchanged.
 */
const noneYetHoldsSentence = (holds: string) => (NONE_YET_HOLDS_SAYS[holds] ?? holds).replace(/^the\s+/i, '')

/**
 * THE KIND OF WORK, NEAR THE TOP OF THE BOARD (item 4). One plain sentence, said once. The lead, or
 * an admin of this organisation, can change it and its stage names; a participant reads it and
 * cannot change it. A name the server refuses is shown exactly as it says it.
 */
export function KindOfWorkBanner({ groundId, kindOfWork, workStages, canEdit, kindsOffered, readerIsTheFounder }: {
  groundId: string
  kindOfWork: KindOfWork | null
  workStages?: string[] | null
  canEdit: boolean
  /**
   * THE RELEASE'S REQUEST (4 October 2026): A NEW CHECK-IN MAY BE GIVEN ONLY SOME OF THE ELEVEN
   * KINDS. The dialog lists only `kindsOffered`, plus the kind this check-in already holds
   * (`kindOfWork`), so a check-in that holds another kind can still be saved. Absent on an older
   * server - keep today's full list then.
   */
  kindsOffered?: KindOfWork[]
  /**
   * THE FOUNDER'S OWN CHECK-IN BOARD, READ BY THE FOUNDER (founder.txt): "This is your own
   * check-in as a founder, about your own commitments and decisions." - "you", not "their", the
   * one time the person reading this sentence is the founder it is about. Every other reader of
   * this kind (a read-only admin, say) still reads `KIND_OF_WORK_SENTENCE`'s own third-person
   * wording, and every other kind of work is unaffected.
   */
  readerIsTheFounder?: boolean
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
    ? (readerIsTheFounder && kindOfWork === "founder's own check-in"
      ? "This is your own check-in as a founder, about your own commitments and decisions."
      : KIND_OF_WORK_SENTENCE[kindOfWork])
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
                {(kindsOffered ? KIND_OF_WORK_OPTIONS.filter((k) => kindsOffered.includes(k) || k === kindOfWork) : KIND_OF_WORK_OPTIONS)
                  .map((k) => <option key={k} value={k}>{KIND_OF_WORK_OPTION_LABEL[k]}</option>)}
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
      <div>{row.saidByLine?.trim() || (saidBy ? `In ${saidBy}'s words,` : 'In the words of someone in this check-in,')}</div>
      {row.said && <p className="gwui-mt-2" style={{fontStyle: 'italic'}}>{`“${row.said}”`}</p>}
    </div>
  )
}

/** `WhatShowsIt`, with its usual small top margin - written once, since every list that draws a
    record (the generic table, the sales deal grid, the timeline, the parties, the themes list)
    wrapped it in the exact same one-off class. */
export function WhatShowsItBlock(props: { row: AServedWorkRow; leadFirstName: string | null; readerIsLead: boolean }) {
  return <div className="gwui-mt-4"><WhatShowsIt {...props} /></div>
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
/** The table row and heading row's own classes, each written once - the generic table and the
    sales deal grid's own table otherwise repeated the exact same string, which is what the guard
    against a growing one-off-class count (one-off-uses-only-go-down.spec.ts) counts. */
const WORK_ROW_CLASS = 'gwui-work-row gwui-gap-14 gwui-pt-12 gwui-pr-16 gwui-pb-12 gwui-pl-16 gwui-rule-top'
const WORK_HEAD_CLASS = 'gwui-work-head gwui-gap-14 gwui-pt-10 gwui-pr-16 gwui-pb-10 gwui-pl-16 gwui-fs-13 gwui-ink-sub'

/** The row's own mark, filled for proven, ringed for the rest, nothing for a record added on the
    board with nothing behind it ("none") - then its name. Shared by every table row (item 3 a):
    written once, so the generic row and the sales deal grid's own row can never draw it two
    different ways. */
function DealMarkAndName({ row }: { row: AServedWorkRow }) {
  return (
    <div className="gwui-ink-text gwui-fs-16" style={{fontWeight: 700}}>
      {(row as any).mark && (row as any).mark !== 'none' && (
        <><ProofMark mark={(row as any).mark} />{' '}</>
      )}
      {row.name}
    </div>
  )
}

/** A small muted line under a row's name - a due date, or (the sales deal grid's own row) the
    rep and the deal's value - shared, so the same small-print styling is only written once. */
function SmallSubLine({ text }: { text: string | null }) {
  return text ? <div className="gwui-note gwui-mt-2">{text}</div> : null
}

/** A due date, as a sentence, where the row has one - shared by every table row. */
function DueLine({ due }: { due: string | null }) {
  return <SmallSubLine text={dueSentence(due)} />
}

/** "Stage now", the row's own single tag, or the plain sentence for a row with none yet - shared
    by every table row that carries a stage. */
function StageCell({ stage }: { stage: string | null }) {
  return (
    <div aria-label="Stage now">
      {stage ? <Tag tone="plain">{stage}</Tag> : <span className="gwui-fs-13-5 gwui-ink-muted">No stage said yet.</span>}
    </div>
  )
}

function WorkRow({ row, leadFirstName, readerIsLead, kindOfWork, hasStageColumn, canEdit, onEdit }: {
  row: AServedWorkRow
  leadFirstName: string | null
  readerIsLead: boolean
  kindOfWork: KindOfWork | null
  /** Whether this section's rows carry a stage, or (the founder's own check-in) a kind, at all. */
  hasStageColumn: boolean
  canEdit: boolean
  onEdit: () => void
}) {
  const fieldEntries = Object.entries(row.fields ?? {})
  const isFounder = kindOfWork === "founder's own check-in"
  return (
    <div
      className={`${WORK_ROW_CLASS}${hasStageColumn ? '' : ' gwui-work-row-nostage'}`}
      role="row"
      aria-label={row.name}
    >
      <div>
        <DealMarkAndName row={row} />
        {fieldEntries.map(([label, value]) => (
          /* Board review, 30 September, item 3: a detail read as a label and a bare value stuck
             together ("Amount KES 45,000") - now a sentence ("The amount is KES 45,000."). */
          <div key={label} className="gwui-note gwui-mt-2">{`The ${label.toLowerCase()} is ${value}.`}</div>
        ))}
        <DueLine due={row.due} />
      </div>
      <div className="gwui-fs-15 gwui-ink-text">
        {row.owner ?? (
          isFounder
            /* The founder is always the owner of their own check-in - "You" is never ambiguous. */
            ? <span className="gwui-ink-muted">You</span>
            /* Board review, sales piece C, item 3 (d): one sentence, the same at every width.
               This used to read "Nobody named yet." on a wide screen and a kind-specific second
               sentence ("No rep is named yet.", "No agent is named yet."...) on a narrow one,
               shown and hidden by a media query - two different claims about the same empty cell,
               depending only on how wide the window happened to be. */
            : <span className="gwui-ink-muted">Nobody is named for it yet.</span>
        )}
      </div>
      {hasStageColumn && (
        isFounder
          ? <div aria-label="Kind"><Tag tone="plain">{row.kind === 'decision' ? 'Decision' : 'Commitment'}</Tag></div>
          : <StageCell stage={row.stageSays ?? row.stage} />
      )}
      <div>
        <Stack gap={4}>
          <WhatShowsIt row={row} leadFirstName={leadFirstName} readerIsLead={readerIsLead} />
          <WhatsNext row={row} />
        </Stack>
      </div>
      {canEdit && (
        <div>
          <Button kind="quiet" size="small" onClick={onEdit}>Change</Button>
        </div>
      )}
    </div>
  )
}

/**
 * THE SALES DEAL GRID'S OWN ROW AND HEADING (board-as-lead.txt: "Deal / Stage now / Next step";
 * each row "Eastside Foods / Aisha, KES 110,000 / Qualified / yesterday / Send the quote, with a
 * photo"). Board review, sales piece C, item 3:
 *
 * (a) ONE SHARED COLUMN TEMPLATE, for both the heading and every row (`SALES_DEAL_GRID_COLUMNS`),
 * with the same number of cells always rendered in both - the trailing column is reserved, not
 * conditionally present, so there is nothing for the heading row and a row to disagree about.
 *
 * (c) NO SEPARATE "REP" COLUMN. The prototype puts the rep and the deal's value under the deal's
 * name, as one line ("Aisha, KES 110,000") - this draws that same line from `row.owner` and the
 * section's own `fields` (the deal's value, served under whatever label the engine gave it, e.g.
 * "Value"), never a column of its own the rest of this grid does not otherwise carry.
 *
 * "WHAT SHOWS IT" HAS NO EQUIVALENT COLUMN IN THE PROTOTYPE'S OWN GRID - its content (the quote or
 * proof behind the number) moves into the row's own detail, under that same line, rather than a
 * column with a head label the prototype never gives it.
 */
const SALES_DEAL_GRID_COLUMNS = { gridTemplateColumns: '1.8fr 1fr 1.5fr auto' }

function SalesDealGridHead() {
  return (
    <div
      className={WORK_HEAD_CLASS}
      style={SALES_DEAL_GRID_COLUMNS}
      role="row"
    >
      <span>Deal</span>
      <span>Stage now</span>
      <span>Next step</span>
      <span />
    </div>
  )
}

/**
 * REQUEST 115 (b): THE DEAL CARD BELOW THE GRID (board-as-lead.txt: "Why it's here.", "Contact
 * history", "{rep}'s read, in their own words", "Not right? Tell the check-in"). A closed fold
 * under the row, not a second page - opened the same way "Who reports to whom" opens. Only drawn
 * from what the engine actually sent: a row with none of `groupSays`, `contactHistory`,
 * `theirRead` or `valueSays` (because this reader may read none of it) gets no fold at all, rather
 * than one that opens onto nothing. The prototype's criteria ticks ("✓ Need", "✓ Budget the
 * customer stated"...) are left out - nothing on record says what a deal must show at each stage
 * (the engine's own `groupsNote`), so a tick here would be invented, not read off the record.
 */
function DealDetail({ row, groundId }: { row: AServedWorkRow; groundId: string }) {
  const hasDetail = !!row.groupSays || !!row.contactHistory?.length || !!row.theirRead || !!row.valueSays || !!row.evidence?.length
  if (!hasDetail) return null
  return (
    <Folded summary="Why it’s here">
      <Stack gap={8}>
        {row.groupSays && <p className="gwui-panel-text">{row.groupSays}</p>}
        {row.valueSays && <Note tone="muted">{row.valueSays}</Note>}
        <WhatsNext row={row} />
        {!!row.contactHistory?.length && (
          <div>
            <SubHeading as="h3">Contact history</SubHeading>
            <Stack gap={4}>
              {row.contactHistory.map((c, i) => (
                <div key={i}>
                  <ProofMark mark={c.how === 'with proof' ? 'proven' : 'said'} /> <Note tone="muted">{c.says}</Note>
                </div>
              ))}
            </Stack>
            {row.contactHistorySays && <Note tone="muted">{row.contactHistorySays}</Note>}
          </div>
        )}
        <ItsEvidence evidence={row.evidence} />
        {row.theirRead && (
          <div>
            <SubHeading as="h3">{row.theirRead.says}</SubHeading>
            <p className="gwui-panel-text" style={{ fontStyle: 'italic' }}>{`“${row.theirRead.words}”`}</p>
          </div>
        )}
        <Link to={`/grounds/${groundId}?tab=chat`} className="gwui-plain-link">Not right? Tell the check-in</Link>
      </Stack>
    </Folded>
  )
}

/** Set by the light sales board: on a phone, each deal is one short line that opens with a tap. */
export const DealRowsAreShortOnAPhone = createContext(false)

function SalesDealGridRow({ row, groundId, leadFirstName, readerIsLead, canEdit, onEdit, onClaim, claimPending }: {
  row: AServedWorkRow
  groundId: string
  leadFirstName: string | null
  readerIsLead: boolean
  canEdit: boolean
  onEdit: () => void
  /** Decision 76, item 3: the lead's yes or no to this row's own `ownerClaim`. Absent for anyone
      else - the server never sends a claim to a colleague, an admin, or the person who said it. */
  onClaim?: (yes: boolean) => void
  claimPending?: boolean
}) {
  const onAPhone = useIsAPhone()
  const shortOnAPhone = useContext(DealRowsAreShortOnAPhone)
  /*
   * REQUEST 115 (b): THE DEAL'S OWN VALUE, where somebody said it (board-as-lead.txt: "Aisha, KES
   * 110,000"). `row.value` is the engine's own field for this now; a field typed into `fields`
   * (e.g. "Value") is kept as the fallback for a row an older server, or the lead's own form,
   * still carries it on.
   */
  const value = row.value ?? Object.values(row.fields ?? {}).find((v) => !!v)
  const repLine = row.owner && value ? `${row.owner}, ${value}`
    : row.owner ? row.owner
      : value ? String(value)
        /* Item 3 (d): the same sentence this grid's old, separate owner column used, so a reader
           who has seen it keeps reading the same words. */
        : 'Nobody is named for it yet.'
  /* REQUEST 115 (b): "LAST CONTACT" - the newest line of `contactHistory`, already a full sentence
     from the record ("On 22 September, somebody spoke about it, and proof backs what they said."),
     never a date computed here. */
  const lastContact = row.contactHistory?.[0]?.says ?? null
  const short = shortOnAPhone && onAPhone
  /*
   * THE LIGHT SALES BOARD ON A PHONE (sales-first.md, section 1): "deals show as a short list (name,
   * stage, last contact, next step)". The rest of the row (who and how much, the due date, their
   * words, why it is here, Change) opens with a tap on the deal, never taken away.
   */
  if (short) {
    return (
      <details className="gwui-deal-short" role="row" aria-label={row.name}>
        <summary className="gwui-deal-short-sum">
          <span className="gwui-deal-short-top">
            <DealMarkAndName row={row} />
            <StageCell stage={row.stageSays ?? row.stage} />
          </span>
          {lastContact && <SmallSubLine text={lastContact} />}
          <span aria-label="Next step"><NextStepCell row={row} /></span>
        </summary>
        <div className="gwui-deal-short-body">
          <SmallSubLine text={repLine} />
          {readerIsLead && row.ownerClaim && (
            <Stack gap={4}>
              <Note tone="muted">{row.ownerClaim.says}</Note>
              <div className="gwui-edge-acts">
                <Button kind="secondary" size="small" disabled={claimPending} onClick={() => onClaim?.(true)}>Yes</Button>
                <Button kind="secondary" size="small" disabled={claimPending} onClick={() => onClaim?.(false)}>No</Button>
              </div>
            </Stack>
          )}
          <DueLine due={row.due} />
          <WhatShowsItBlock row={row} leadFirstName={leadFirstName} readerIsLead={readerIsLead} />
          <DealDetail row={row} groundId={groundId} />
          {canEdit && <div><Button kind="quiet" size="small" onClick={onEdit}>Change</Button></div>}
        </div>
      </details>
    )
  }
  return (
    <div
      className={WORK_ROW_CLASS}
      style={SALES_DEAL_GRID_COLUMNS}
      role="row"
      aria-label={row.name}
    >
      <div>
        <DealMarkAndName row={row} />
        <SmallSubLine text={repLine} />
        {/*
          DECISION 76, ITEM 3: "You said the Tuskys Westgate deal is yours. Is it?", next to
          "Nobody is named for it yet." above - sent to the lead alone, with the claim already
          said as a full sentence. Only her yes sets the owner (`POST .../work-items/:itemId/claim`
          with `{ yes }`, through `boardApi.claimWorkItem`, the same fixed, this-check-in-only path
          every other record call on this row already uses). Secondary buttons, never a second
          navy one beside "Change".
        */}
        {readerIsLead && row.ownerClaim && (
          <Stack gap={4}>
            <Note tone="muted">{row.ownerClaim.says}</Note>
            <div className="gwui-edge-acts">
              <Button kind="secondary" size="small" disabled={claimPending} onClick={() => onClaim?.(true)}>Yes</Button>
              <Button kind="secondary" size="small" disabled={claimPending} onClick={() => onClaim?.(false)}>No</Button>
            </div>
          </Stack>
        )}
        <DueLine due={row.due} />
        {lastContact && <SmallSubLine text={lastContact} />}
        <WhatShowsItBlock row={row} leadFirstName={leadFirstName} readerIsLead={readerIsLead} />
        <DealDetail row={row} groundId={groundId} />
      </div>
      <StageCell stage={row.stageSays ?? row.stage} />
      <div aria-label="Next step">
        <NextStepCell row={row} />
      </div>
      {canEdit ? (
        <div><Button kind="quiet" size="small" onClick={onEdit}>Change</Button></div>
      ) : <div />}
    </div>
  )
}

function WorkTableHead({ itemNoun, ownerLabel, hasStageColumn, isFounder, canEdit }: {
  itemNoun: string
  ownerLabel: string
  hasStageColumn: boolean
  isFounder: boolean
  canEdit: boolean
}) {
  return (
    <div
      className={`${WORK_HEAD_CLASS}${hasStageColumn ? '' : ' gwui-work-head-nostage'}`}
      role="row"
    >
      <span>{itemNoun}</span>
      <span>{ownerLabel}</span>
      {hasStageColumn && <span>{isFounder ? 'Kind' : 'Stage now'}</span>}
      <span>What shows it</span>
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
                <WhatShowsItBlock row={row} leadFirstName={leadFirstName} readerIsLead={readerIsLead} />
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
                <WhatShowsItBlock row={row} leadFirstName={leadFirstName} readerIsLead={readerIsLead} />
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
                  <WhatShowsItBlock row={row} leadFirstName={leadFirstName} readerIsLead={readerIsLead} />
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
function WorkRecordSectionBlock({ groundId, kindOfWork, section, participants, leadFirstName, readerIsLead, canEdit, hideStageTrack }: {
  groundId: string
  kindOfWork: KindOfWork | null
  section: AServedWorkSection
  participants: { id: string; name: string | null }[]
  leadFirstName: string | null
  readerIsLead: boolean
  canEdit: boolean
  /** Request 133: an asset loans cohort's own "The shape of the work" strip moves into the end
      fold instead of drawing here - see the comment above where it would otherwise draw. */
  hideStageTrack?: boolean
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
  /**
   * DECISION 76, ITEM 3: THE LEAD'S YES OR NO TO A RECORD'S `ownerClaim` ("You said the Tuskys
   * Westgate deal is yours. Is it?"). `saidBack` is the engine's own sentence for what just
   * happened ("The Tuskys Westgate deal is now Rukia Otieno's.", or "...still has nobody's name on
   * it."), read back the same way `useRunBoardAction` already reads `saidBack` for every other
   * action on this board (BoardPage.tsx).
   */
  const claimItem = useMutation({
    mutationFn: (v: { itemId: string; yes: boolean }) => boardApi.claimWorkItem(groundId, v.itemId, v.yes),
    onSuccess: (data) => { invalidate(); if (data?.saidBack) toast.success(data.saidBack) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. Nothing has changed, so try again.'),
  })

  const heading = sectionHeading(kindOfWork, section)
  const isDealGrid = section.section === 'Deal grid'
  const dealGridRows = section.state === 'filled' || section.state === 'none-yet' ? section.rows : []
  /*
   * REQUEST 112 (a): "Grouped by what the proof says about closing this quarter." is the subtitle
   * for the groups the engine now sends (`section.groups`) - it used to guess at whether a grouping
   * was worth claiming from a row's proof mark, before any group existed to show. Now it reads only
   * once the engine has actually put the rows into groups.
   */
  const dealGroups = section.state === 'filled' || section.state === 'none-yet' ? section.groups : undefined
  /*
   * PROJECT BOARD REVIEW 1, FIX 9: THE ENGINE'S OWN "ONLY YOURS" NOTE. A participant's own board
   * already has each section filtered server-side to just their rows (`a-participants-board-is-
   * their-own.ts`), which sends `onlyYours: 'Only yours.'` on that section - drawn nowhere here
   * before, so a participant read the whole kind-of-work record with no sign it had already been
   * narrowed to theirs.
   */
  const onlyYours = section.state !== 'not-known' ? section.onlyYours ?? undefined : undefined
  const note = (isDealGrid && kindOfWork && dealGroups?.length ? DEAL_GRID_NOTE[kindOfWork] : undefined)
    ?? (section.section === 'Themes' && kindOfWork ? THEMES_NOTE[kindOfWork] : undefined)
    ?? onlyYours ?? undefined

  if (section.state === 'not-known') {
    return (
      <Section heading={heading} note={note}>
        <p className="gwui-fs-13-5 gwui-ink-muted" style={{fontStyle: 'italic', lineHeight: 1.5}}>{section.why}</p>
      </Section>
    )
  }

  const canAdd = canEdit && !!ITEM_KINDS_FOR_HOLDS[section.holds]?.length

  if (section.state === 'none-yet') {
    /*
     * BOARD REVIEW, OPS BOARD, ITEM 5: A PARTICIPANT WHOSE OWN ROWS ARE EMPTY STILL READS "NO
     * {RECORD}S HAVE COME UP YET.", EVEN WHEN THE LEAD HAS ALREADY ADDED ONE FOR SOMEBODY ELSE. The
     * sentence is true of the whole check-in, not of what this reader was actually sent - this
     * section is already narrowed to "only yours" (`onlyYours` above), so an empty `section.rows`
     * here means none of those rows is this reader's own, not that nothing has been said at all.
     */
    const holdsWord = noneYetHoldsSentence(section.holds)
    const sentence = onlyYours
      ? `None of the ${holdsWord} so far is yours. Yours appear here when you name one in a check-in${canAdd ? ', or when you add one below.' : '.'}`
      : `No ${holdsWord} have come up yet. They appear here when someone names one in a check-in${canAdd ? ', or when you add one below.' : '.'}`
    return (
      <Section heading={heading} note={note}>
        <p className="gwui-ink-sub gwui-fs-15" style={{lineHeight: 1.55}}>
          {sentence}
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
    for (const row of section.rows) { const st = row.stageSays ?? row.stage; if (st) stageCounts[st] = (stageCounts[st] ?? 0) + 1 }
  }

  /* BOARD REVIEW, SALES PIECE C: the sales org's own Deal grid draws its own head and row shape
     (item 3 a, c, d - see `SalesDealGridHead`/`SalesDealGridRow`), not the generic table every
     other kind of work shares. */
  const isSalesDealGrid = isDealGrid && isASalesKind(kindOfWork)
  /*
   * PROJECT BOARD REVIEW 1, FIX 10: "NOT RIGHT? TELL THE CHECK-IN" ON THE ENGINEERING GRID TOO.
   * eng.txt's own grid carries this line under its rows ("Something here wrong? Anyone can
   * correct what's about their own work in their check-in; the change and the original both show
   * here."), the same invitation the sales deal grid already gives through `DealDetail` - but
   * the engine does not yet send the sales grid's own per-row detail fields (`groupSays`,
   * `contactHistory`, `theirRead`) for an engineering release, so there is no row-level fold to
   * hang it on yet. Said once, under the grid, rather than left out until that data exists.
   */
  const isEngineeringDealGrid = isDealGrid && kindOfWork === 'engineering release'
  const dealGridContent = isTimeline ? (
        <TimelineList rows={section.rows} canEdit={canEdit} leadFirstName={leadFirstName} readerIsLead={readerIsLead} onEdit={setEditingRow} />
      ) : isObligations ? (
        <PartiesList rows={section.rows} canEdit={canEdit} leadFirstName={leadFirstName} readerIsLead={readerIsLead} onEdit={setEditingRow} />
      ) : isThemes ? (
        <ThemesList rows={section.rows} canEdit={canEdit} leadFirstName={leadFirstName} readerIsLead={readerIsLead} onEdit={setEditingRow} />
      ) : isSalesDealGrid ? (
        <Panel pad={false}>
          <div role="table" aria-label={heading}>
            <SalesDealGridHead />
            {/*
              REQUEST 112 (a): EACH DEAL IN ITS GROUP (board-as-lead.txt: "Likely by 30 September /
              Every criterion proven or close, a date before the end, recent contact", then its
              rows; then "Possible", "Next quarter", "Cooling", "Won"). `dealGroups` already carries
              only the groups that have a deal in them, in the prototype's own order. A board whose
              rows have not yet been grouped (an older server, or a kind of work this never applies
              to) falls back to one flat list, as before.
            */}
            {dealGroups?.length
              ? dealGroups.map((g) => (
                <div key={g.group}>
                  {/*
                    PHONE CHECK, ITEM 6: the group heading and its reason ("Possible", "Won") sat
                    flush on the card's own left border and ran into its rounded corner - this grid
                    draws inside `Panel pad={false}` (no padding of its own), and every row inside
                    it carries its own inset (`SalesDealGridHead`'s `WORK_HEAD_CLASS`,
                    `SalesDealGridRow`), but the group row between them had none. `.gwui-work-group-row`
                    (gw-ui.css) gives it the same 16px left/right inset as the header row above it,
                    so the heading lines up with "Deal" - a named shared part, not an inline style
                    (`WorkRecords.tsx` is a rebuilt page, so an inline padding style fails
                    `the-rebuilt-pages-use-only-the-new-parts.spec.ts`) and not one of the atomic
                    one-off classes `one-off-uses-only-go-down.spec.ts` freezes the count of either.
                    See docs/the-parts-against-the-prototype.md.
                  */}
                  <div role="row" className="gwui-work-group-row">
                    <SubHeading>{g.heading}</SubHeading>
                    <Note tone="muted">{g.reason}</Note>
                  </div>
                  {g.rowIds.map((rowId) => {
                    const row = section.rows.find((r) => r.id === rowId)
                    return row ? (
                      <SalesDealGridRow
                        key={row.id}
                        row={row}
                        groundId={groundId}
                        leadFirstName={leadFirstName}
                        readerIsLead={readerIsLead}
                        canEdit={canEdit}
                        onEdit={() => setEditingRow(row)}
                        onClaim={(yes) => claimItem.mutate({ itemId: row.id, yes })}
                        claimPending={claimItem.isPending}
                      />
                    ) : null
                  })}
                </div>
              ))
              : section.rows.map((row) => (
                <SalesDealGridRow
                  key={row.id}
                  row={row}
                  groundId={groundId}
                  leadFirstName={leadFirstName}
                  readerIsLead={readerIsLead}
                  canEdit={canEdit}
                  onEdit={() => setEditingRow(row)}
                  onClaim={(yes) => claimItem.mutate({ itemId: row.id, yes })}
                  claimPending={claimItem.isPending}
                />
              ))}
          </div>
        </Panel>
      ) : (
        <Panel pad={false}>
          <div role="table" aria-label={heading}>
            <WorkTableHead itemNoun={itemNoun} ownerLabel={ownerLabel} hasStageColumn={hasStageColumn} isFounder={isFounder} canEdit={canEdit} />
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
              />
            ))}
          </div>
        </Panel>
      )

  return (
    <Section heading={heading} note={note}>
      {isSalesDealGrid ? <Stack gap={12}><DealGridKey rows={dealGridRows} />{dealGridContent}</Stack> : dealGridContent}

      {/*
        LOST DEALS, AND WHY (Hafsah, 18 October: a Lost stage). Never in a group or an open total; one line each, in the
        server's own sentences: what happened and why, in the rep's words, what shows it, and a lesson only where the record has one.
      */}
      {isSalesDealGrid && 'lost' in section && (section.lost ?? []).length > 0 && (
        <Stack gap={6}>
          <SubHeading>Lost deals, and why</SubHeading>
          <Note tone="muted">A reason with no source stays unverified. An unknown reason is flagged, because it can’t be learned from.</Note>
          {(section.lost ?? []).map((l) => <Note key={`lost-${l.id}`}>{[l.says, l.reasonFrom, l.lesson].filter(Boolean).join(' ')}</Note>)}
        </Stack>
      )}

      {/*
        REQUEST 112 (a): WHAT THE RECORD CANNOT SUPPORT, SAID PLAINLY ONCE UNDER THE GRID
        ("Nothing on record says what a deal must show at each stage..."). Never claimed by a
        group's own heading or reason - said once, here, so no group reads as more than it is.
      */}
      {isSalesDealGrid && !!section.groupsNote?.length && (
        <Stack gap={4}>
          {section.groupsNote.map((n, i) => <Note key={i} tone="muted">{n}</Note>)}
        </Stack>
      )}

      {/*
        BOARD REVIEW, SALES PIECE C, ITEM 3 (f): NOT HERE FOR THE SALES DEAL GRID. "The shape of
        the work" is the same stage-by-stage count "Reported vs criteria met, stage by stage"
        (`ReportedAgainstCriteriaSection`, drawn once elsewhere on the board, in the prototype's
        own place for it - board-as-lead.txt) already gives, for this one kind of work - two
        readings of the same shape, under two different headings. Every other kind of work has no
        such section anywhere else on the board, so it keeps "The shape of the work" here, the
        only place it is told at all.

        REQUEST 133: NOT HERE FOR AN ASSET LOANS COHORT EITHER. loans.txt does not show this strip
        under its own table - the records table stays open for this kind
        (`kindLayout['asset loans'].teamInFoldRecordsOpen`) while this strip alone moves into the
        end fold; see `hideStageTrack`, passed in from BoardPage.tsx, and
        `TheShapeOfTheWorkStrip`, exported below for the fold to draw it there instead.
      */}
      {!!section.stages?.length && !isSalesDealGrid && !hideStageTrack && (
        <TheShapeOfTheWork stages={section.stages} counts={stageCounts} itemNoun={itemNoun} />
      )}

      {isEngineeringDealGrid && (
        <div>
          <Link to={`/grounds/${groundId}?tab=chat`} className="gwui-plain-link">Not right? Tell the check-in</Link>
        </div>
      )}

      {/*
        THE FOUNDER'S OWN CHECK-IN BOARD (founder.txt): "Something here wrong? Anyone can correct
        what's about their own work in their check-in; the change and the original both show
        here." - the prototype's own words, exactly, the same invitation `DealDetail` and
        `isEngineeringDealGrid` give for their own kinds. Only when the founder actually can
        correct a record here (`canEdit`) - this is a one-person board, so a reader without that
        right (a read-only admin, say) is never told to go correct what is not theirs to correct.
      */}
      {isFounder && canEdit && (
        <div>
          <Note tone="muted">Something here wrong? Anyone can correct what's about their own work in their check-in; the change and the original both show here.</Note>
        </div>
      )}

      {canAdd && (
        <div className="pb-add-record">
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
/** The prototype's own heading for this reader's own records (board-as-participant.txt: "Your
    deals, day by day"), where it has one - otherwise the same shape every other kind uses. */
const YOUR_OWN_HEADING: Partial<Record<KindOfWork, string>> = {
  'sales team': 'Your deals, day by day',
  'sales org': 'Your deals, day by day',
}

export function YourOwnRecordsSections({ groundId, kindOfWork, sections, myParticipantId, leadFirstName }: {
  groundId: string
  kindOfWork?: KindOfWork | null
  sections?: AServedWorkSection[]
  myParticipantId: string | null
  leadFirstName: string | null
}) {
  /* The direct morning (lib/the-direct-morning.tsx): no "Only yours." note. Which rows are hers is the backend's rule, the same either way. */
  const direct = useTheDirectMorning()
  if (!sections?.length || !myParticipantId) return null
  const itemNoun = (kindOfWork ? ITEM_NOUN_FOR_KIND[kindOfWork] : 'Item').toLowerCase()
  const heading = (kindOfWork ? YOUR_OWN_HEADING[kindOfWork] : undefined) ?? `Your own ${itemNoun}s, day by day`
  const isSalesDeals = isASalesKind(kindOfWork)
  const mine = sections
    .filter((s): s is Extract<AServedWorkSection, { state: 'filled' | 'none-yet' }> => s.state !== 'not-known')
    .flatMap((s) => (s.rows ?? []).filter((r) => r.ownerParticipantId === myParticipantId))
  return (
    <Section heading={heading} note={direct ? undefined : 'Only yours.'}>
      {/*
        BOARD FIX (sales B, item 3b): A READER WITH NO ROWS STILL READS A SENTENCE, NOT A MISSING
        SECTION. The engine itself sends every row ever said about this reader's own work (request
        111 is about rows going missing server-side, not about this screen hiding what it is sent),
        so an empty `mine` here is read plainly rather than by vanishing the whole heading.
      */}
      {mine.length === 0 ? (
        <Note tone="muted">{`You have no ${itemNoun}s on record yet.`}</Note>
      ) : (
        <Stack gap={12}>
          {isSalesDeals && <DealGridKey rows={mine} behindInfo />}
          <Panel pad={false}>
            <RowList label={heading}>
              {mine.map((row) => (
                <Row key={row.id} columns="1fr" inset="record">
                  <div>
                    <div className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700 }}>
                      {row.mark && row.mark !== 'none' && <><ProofMark mark={row.mark} />{' '}</>}
                      {row.name}
                    </div>
                    {(row.stageSays ?? row.stage) && <div className="gwui-mt-2"><Tag tone="plain">{row.stageSays ?? row.stage}</Tag></div>}
                    {dueSentence(row.due) && <div className="gwui-note gwui-mt-2">{dueSentence(row.due)}</div>}
                    <div className="gwui-mt-4">
                      <Stack gap={4}>
                        <WhatShowsIt row={row} leadFirstName={leadFirstName} readerIsLead={false} />
                        {isSalesDeals && <NextStepCell row={row} />}
                      </Stack>
                    </div>
                    {isSalesDeals && <DealDetail row={row} groundId={groundId} />}
                  </div>
                </Row>
              ))}
            </RowList>
          </Panel>
        </Stack>
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
export function WorkRecordsSections({ groundId, kindOfWork, sections, participants, leadFirstName, readerIsLead, canEdit, collapseWhenAllNotKnown, hideStageTrack }: {
  groundId: string
  kindOfWork?: KindOfWork | null
  sections?: AServedWorkSection[]
  participants: { id: string; name: string | null }[]
  leadFirstName: string | null
  readerIsLead: boolean
  canEdit: boolean
  /** Request 133: passed through to each section so an asset loans cohort's own "The shape of the
      work" strip can move into the end fold instead - see `WorkRecordSectionBlock`. */
  hideStageTrack?: boolean
  /**
   * PROJECT BOARD REVIEW 1, FIX 3: NO KIND OF WORK, ONE SENTENCE, NOT SIX HEADED SECTIONS. A
   * check-in with no kind of work chosen at all (the DRIFT fixture, "The partnerships work has
   * gone quiet", dac969d3) gets every `workRecords` section back as not-known with the exact same
   * `why`, and nothing else on the board to say instead - drawn as before, that repeated the same
   * italic sentence six times, each under its own heading, four of them the switchboard's own
   * internal names ("Deal grid", "Forecast", "Themes", "Work plan"), never a sentence a person
   * reads. The caller works out whether that is really true for this board (it is not, for the
   * onboarding board's own `workRecords`, which looks the same but has real "Work plan" and
   * "Timeline" content elsewhere) and passes the answer in here, rather than this component
   * guessing from the sections alone.
   */
  collapseWhenAllNotKnown?: boolean
}) {
  if (!sections?.length) return null

  if (collapseWhenAllNotKnown) {
    return (
      <div className="gwui-page-wrap">
        <Note tone="muted">{(sections[0] as { why: string }).why}</Note>
      </div>
    )
  }

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
          hideStageTrack={hideStageTrack}
        />
      ))}
    </div>
  )
}

/**
 * THE ACTUAL STRIP, FACTORED OUT SO ITS MARKUP - AND THE ONE-OFF CLASSES IT CARRIES - EXISTS ONCE
 * IN THIS FILE, NOT ONCE INLINE AND ONCE AGAIN FOR THE FOLD (one-off-uses-only-go-down.spec.ts:
 * counts rise when the same classes are typed out twice).
 */
function TheShapeOfTheWork({ stages, counts, itemNoun }: { stages: string[]; counts: Record<string, number>; itemNoun: string }) {
  return (
    <div className="pb-add-record">
      <p className="gwui-mb-8 gwui-fs-16 gwui-ink-text" style={{fontWeight: 700}}>The shape of the work</p>
      <StageTrack stages={stages} counts={counts} itemNoun={itemNoun} />
    </div>
  )
}

/**
 * REQUEST 133: "THE SHAPE OF THE WORK", DRAWN ALONE, FOR THE END FOLD (loans.txt does not show
 * this strip under its own table - see `hideStageTrack`, above). Reads the same Deal grid section
 * `WorkRecordSectionBlock` would have drawn it from, so the fold shows the same stage counts, only
 * moved.
 */
export function TheShapeOfTheWorkStrip({ kindOfWork, sections }: { kindOfWork?: KindOfWork | null; sections?: AServedWorkSection[] }) {
  const section = (sections ?? []).find((s) => s.section === 'Deal grid')
  if (!section || section.state === 'not-known' || !section.stages?.length) return null
  const stageCounts: Record<string, number> = {}
  for (const row of section.rows) { const st = row.stageSays ?? row.stage; if (st) stageCounts[st] = (stageCounts[st] ?? 0) + 1 }
  const itemNoun = kindOfWork ? ITEM_NOUN_FOR_KIND[kindOfWork] : 'Item'
  return <TheShapeOfTheWork stages={section.stages} counts={stageCounts} itemNoun={itemNoun} />
}

/**
 * CHANGING A DEAL, CONFIRMING WHOSE IT IS, AND ADDING ONE, FOR THE BOARD AS PICTURED (screen match, 16
 * October; pictured/ThePicturedSalesBoard.tsx). The same mutations and the same form as the deal grid
 * above, so nothing the lead could do on the old grid is lost: "Change" (with "Remove this record"),
 * the claim's yes and no (decision 76, item 3), and "Add a record".
 */
export function TheDealsCanBeChanged({ groundId, section, participants, canEdit, children }: {
  groundId: string
  section: Extract<AServedWorkSection, { rows: AServedWorkRow[] }>
  participants: { id: string; name: string | null }[]
  canEdit: boolean
  children: (api: { edit: (row: AServedWorkRow) => void; claim: (row: AServedWorkRow, yes: boolean) => void; claimPending: boolean }) => ReactNode
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
  const claimItem = useMutation({
    mutationFn: (v: { itemId: string; yes: boolean }) => boardApi.claimWorkItem(groundId, v.itemId, v.yes),
    onSuccess: (data) => { invalidate(); if (data?.saidBack) toast.success(data.saidBack) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. Nothing has changed, so try again.'),
  })
  const canAdd = canEdit && !!ITEM_KINDS_FOR_HOLDS[section.holds]?.length
  return (
    <>
      {children({ edit: setEditingRow, claim: (row, yes) => claimItem.mutate({ itemId: row.id, yes }), claimPending: claimItem.isPending })}
      {canAdd && (
        <div className="pb-add-record">
          <button onClick={() => setAdding(true)} className="gwui-plain-link">Add a record</button>
        </div>
      )}
      {adding && (
        <WorkItemForm section={section} participants={participants} editing={null} onClose={() => setAdding(false)} onSaved={(dto) => addItem.mutate(dto)} />
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
    </>
  )
}
