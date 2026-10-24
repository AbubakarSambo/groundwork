import { TheDirectMorning, useTheDirectMorning, isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  groundsApi, type ReferencesAndResources, type AReferenceLine, type AReferenceKind, type AnEvidencePage,
} from '@/api/grounds'
import { documentsApi } from '@/api/documents'
import {
  Section, Panel, Button, Note, Callout, Stack, FlexRow, Tag, Text, TextField, TextArea, Select, FieldLabel, FieldRows, FieldRow,
  RowList, Row, SubHeading, Folded,
} from '@/components/gw/ui'
import { BaselinePanel } from '@/components/gw/BaselinePanel'
import { AddADocument } from '@/components/gw/AddADocument'
import { FromAPlan } from '@/components/gw/ThePlanPage'
import { useAskStore } from '@/stores/ask'
import { UPLOAD_ACCEPT_ATTR } from '@/lib/what-you-can-upload'

/**
 * REFERENCES AND RESOURCES, AS THE B6 PICTURES DRAW IT (Release 1B, pull request 2 of 3; Hafsah's references-and-my-work.md of
 * 17 October 2026, the wording from docs/prototype/screens/B6-references-and-resources/*.txt). Drawn only where the
 * organisation's Release 1B switch is on; off, ContextPage.tsx draws today's Context tab exactly as it was.
 *
 * ONE TEMPLATE FOR EVERY SCENARIO. The sections and their order never change: the top line, About this work, Suggested from
 * your check-ins (the lead only, when there is one), How we work, Documents, Evidence, Questions and answers, and People (the
 * lead only). Only the words and the data change, and both come from the server (GET /grounds/:id/references-and-resources),
 * which sends each reader only what they may read: a team member's payload has no People, no suggestions and none of the lead's
 * notes, so nothing here hides anything.
 *
 * ONLY THE LEAD ADDS. "Add", and the controls on each line, are drawn only where the server says `mayAdd`; the server refuses
 * anybody else whatever is drawn.
 *
 * WHERE THE PICTURE AND THE PRODUCT DIFFER (listed for Hafsah in docs/pull-request.md): a heading carries its count in the
 * sentence under it rather than after a dot; "Suggested from your check-ins" holds a plan's proposals still waiting for the lead,
 * because nothing yet picks a rule out of her own check-in; Questions and answers says nobody has asked yet, because Ask does
 * not keep the questions asked about one check-in yet.
 */
type Served = Extract<ReferencesAndResources, { on: true }>

const ADDS: { kind: AReferenceKind | 'DOCUMENT' | 'PLAN'; label: string }[] = [
  { kind: 'RULE', label: 'A rule' },
  { kind: 'STAGE_NEEDS', label: 'What a stage needs' },
  { kind: 'COACHING', label: 'Coaching for the team' },
  { kind: 'RISK', label: 'A risk to watch for' },
  { kind: 'KEY_FACT', label: 'A key fact' },
  { kind: 'PERSON_NOTE', label: 'Your note on a person' },
  { kind: 'HELP_WITH', label: 'What to help a person with' },
  { kind: 'DOCUMENT', label: 'A document' },
  { kind: 'PLAN', label: 'A plan' },
]

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`

export function ReferencesAndResourcesPage({ groundId, ground, isTheLead }: { groundId: string; ground: any; isTheLead: boolean }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['references', groundId],
    queryFn: () => groundsApi.referencesAndResources(groundId),
    enabled: !!groundId,
  })
  if (isLoading) return <Note role="status">Getting References and resources…</Note>
  if (error || !data) return <Callout tone="warning">References and resources could not be read just now. Try again in a moment.</Callout>
  if (!data.on) return null
  /* The direct morning (lib/the-direct-morning.tsx): said once for the page, from what it is served. */
  return <TheDirectMorning on={isTheDirectMorningOn(data)}><ThePage groundId={groundId} served={data} ground={ground} isTheLead={isTheLead} /></TheDirectMorning>
}

function ThePage({ groundId, served, ground, isTheLead }: { groundId: string; served: Served; ground: any; isTheLead: boolean }) {
  const qc = useQueryClient()
  const show = useAskStore((s) => s.show)
  const [adding, setAdding] = useState<AReferenceKind | 'DOCUMENT' | 'PLAN' | null>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ['references', groundId] })
  const people = served.people ?? []

  return (
    /* B6: section headings in Literata, as the picture draws them (gwui-b-tab). */
    <div className="gwui-b-tab">
    <Stack gap={30}>
      {/* THE TOP BAR: one line on what the page is, "Ask about this work", and "Add" for the lead. */}
      <div data-gw-references-top>
        {/* B6: the top line sits in a light band, with its two actions at the right. */}
        <div className="gwui-ref-band">
        <FlexRow gap={12} align="center" wrap justify="space-between">
          <Text size="15" ink="sub" as="p">{served.topLine}</Text>
          <FlexRow gap={8} wrap>
            <Button kind="secondary" size="small" onClick={() => show()}>Ask about this work</Button>
            {served.mayAdd && <Button kind="primary" size="small" onClick={() => setAdding(adding ? null : 'RULE')}>Add</Button>}
          </FlexRow>
        </FlexRow>
        </div>
        {served.mayAdd && adding && (
          <AddSomething groundId={groundId} kind={adding} onKind={setAdding} people={people} alsoSeenBy={served.peopleAlsoSeenBy} contextEnabled={ground?.contextEnabled === true}
            onDone={() => { setAdding(null); refresh() }} />
        )}
      </div>

      <AboutThisWork groundId={groundId} served={served} ground={ground} isTheLead={isTheLead} />
      {served.suggested && served.suggested.length > 0 && <Suggested groundId={groundId} items={served.suggested} onDone={refresh} />}
      <HowWeWork groundId={groundId} served={served} onDone={refresh} />
      <Documents served={served} />
      <Evidence groundId={groundId} served={served} />
      <QuestionsAndAnswers served={served} />
      {served.people && <People groundId={groundId} people={served.people} alsoSeenBy={served.peopleAlsoSeenBy} onDone={refresh} />}
    </Stack>
    </div>
  )
}

/* -------------------------------------------------------------------------------------------- About this work */

function AboutThisWork({ groundId, served, ground, isTheLead }: { groundId: string; served: Served; ground: any; isTheLead: boolean }) {
  const a = served.about
  return (
    <Section heading="About this work">
      <Stack gap={12}>
        <Panel>
          <Stack gap={8}>
          {a.purpose ? (
            <>
              <p data-gw-references-purpose className="gwui-panel-text gwui-pre-line">{'“'}{a.purpose}{'”'}</p>
              {a.whose && <Note>{a.whose}</Note>}
              {a.yourOwnWords && (
                /* A plain fold with no box of its own: the prototype never puts a box inside a box. */
                <details className="t-small">
                  <summary className="gw-link" style={{ listStyle: 'none', display: 'inline' }}>What you wrote</summary>
                  <p className="mut gwui-pre-line" style={{ marginTop: 6 }}>{a.yourOwnWords}</p>
                </details>
              )}
            </>
          ) : (
            <p className="gwui-panel-text-muted">{a.emptySays}</p>
          )}
          {a.keyFacts.length > 0 && (
            <FieldRows>
              {a.keyFacts.map((f) => <FieldRow key={f.id} label={f.label} value={f.fact} />)}
            </FieldRows>
          )}
          {a.keyFacts.length === 0 && (
            <Note tone="muted">{served.mayAdd ? 'No key facts yet. Add the three things everyone should know about this work.' : 'No key facts have been added yet.'}</Note>
          )}
          </Stack>
        </Panel>
        {a.alsoWorthKnowing.length > 0 && (
          <Panel>
            <SubHeading as="h3">Also worth knowing</SubHeading>
            <Lines lines={a.alsoWorthKnowing} />
          </Panel>
        )}
        {/* "What doing well looks like" moves here from People and setup, with its versions and wording (Hafsah, 18 October). */}
        <BaselinePanel asFold groundId={groundId} canState={isTheLead} groundStartedAt={ground?.startsAt || ground?.createdAt} />
      </Stack>
    </Section>
  )
}

/* ------------------------------------------------------------------------------------------------- Suggested */

function Suggested({ groundId, items, onDone }: { groundId: string; items: NonNullable<Served['suggested']>; onDone: () => void }) {
  const [editing, setEditing] = useState<{ id: string; says: string } | null>(null)
  const [showAll, setShowAll] = useState(false)
  const failed = (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. Try again in a moment.')
  const add = useMutation({ mutationFn: (id: string) => groundsApi.confirmPlanCard(groundId, id, null), onSuccess: onDone, onError: failed })
  const dismiss = useMutation({ mutationFn: (id: string) => groundsApi.planCardNotNow(groundId, id), onSuccess: onDone, onError: failed })
  const edit = useMutation({ mutationFn: (e: { id: string; says: string }) => groundsApi.editPlanCard(groundId, e.id, e.says), onSuccess: () => { setEditing(null); onDone() }, onError: failed })
  return (
    <Section heading="Suggested from your check-ins">
      <Stack gap={10}>
        {items.slice(0, showAll ? items.length : 2).map((s, i) => (
          /* B6: one compact amber row each, what it says on the left and its three actions on the right. */
          <div key={s.id} className="gwui-suggestion-row">
            <div data-gw-suggestion={s.id}>
              <Note tone="muted">{`${s.from}, ${s.what}.`}</Note>
              {editing?.id === s.id ? (
                <TextArea value={editing.says} rows={2} onChange={(e) => setEditing({ id: s.id, says: e.target.value })} aria-label="The line, in your words" />
              ) : (
                <Text size="15" weight={600} as="p">{s.says}</Text>
              )}
              {s.saidAs && <Note>{`The plan says “${s.saidAs}”`}</Note>}
            </div>
              <FlexRow gap={8} wrap align="center">
                {editing?.id === s.id ? (
                  <>
                    <Button kind="secondary" size="small" onClick={() => edit.mutate(editing)} disabled={edit.isPending || !editing.says.trim()}>Save</Button>
                    <Button kind="secondary" size="small" onClick={() => setEditing(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    {/* B6: Add, Edit, and Dismiss as a plain word. Only the first card's Add is navy. */}
                    <Button kind={i === 0 ? 'primary' : 'secondary'} size="small" onClick={() => add.mutate(s.id)} disabled={add.isPending}>Add</Button>
                    <Button kind="secondary" size="small" onClick={() => setEditing({ id: s.id, says: s.says })}>Edit</Button>
                    <button type="button" className="gw-link t-small" onClick={() => dismiss.mutate(s.id)} disabled={dismiss.isPending}>Dismiss</button>
                  </>
                )}
              </FlexRow>
          </div>
        ))}
        {items.length > 2 && !showAll && (
          <button type="button" className="gw-link t-small" style={{ alignSelf: 'flex-start' }} onClick={() => setShowAll(true)}>{`Show the other ${items.length - 2}`}</button>
        )}
      </Stack>
    </Section>
  )
}

/* ------------------------------------------------------------------------------------------------- How we work */

function Lines({ lines, onRemove }: { lines: AReferenceLine[]; onRemove?: (id: string) => void }) {
  return (
    <ul className="gwui-panel-list gwui-stack-6">
      {lines.map((l) => (
        <li key={l.id} data-gw-reference-line={l.id}>
          <FlexRow gap={8} align="center" wrap>
            <span>{l.text}</span>
            {l.fromTheTemplate && <Tag>{'Groundwork’s'}</Tag>}
            {l.onlyYou && <Tag tone="attention">Only you</Tag>}
            {onRemove && !l.fromTheTemplate && <button type="button" className="gw-link t-small" onClick={() => onRemove(l.id)}>Remove</button>}
          </FlexRow>
        </li>
      ))}
    </ul>
  )
}

function HowWeWork({ groundId, served, onDone }: { groundId: string; served: Served; onDone: () => void }) {
  const remove = useMutation({
    mutationFn: (id: string) => groundsApi.changeAReference(groundId, id, { closed: true }),
    onSuccess: onDone,
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change. Try again in a moment.'),
  })
  const h = served.howWeWork
  const empty = served.mayAdd ? 'Nothing here yet. Use Add to write the first one.' : 'Nothing here yet.'
  const part = (title: string, lines: AReferenceLine[]) => (
    <Panel>
      <SubHeading as="h3">{title}</SubHeading>
      {lines.length ? <Lines lines={lines} onRemove={served.mayAdd ? (id) => remove.mutate(id) : undefined} /> : <Note tone="muted">{empty}</Note>}
    </Panel>
  )
  return (
    <Section heading="How we work" note="Check-ins use these to guide each person and to know what to ask about.">
      {/* B6: the four parts side by side, one small panel each. */}
      <Stack gap={8}>
        <div className="gwui-four-up">
          {part('Rules', h.rules)}
          {part('What each stage needs', h.stageNeeds)}
          {part('Coaching', h.coaching)}
          {part('Risks to watch for', h.risks)}
        </div>
        {h.startingSetSays && <Note tone="muted">{h.startingSetSays}</Note>}
      </Stack>
    </Section>
  )
}

/* ---------------------------------------------------------------------------------------------------- Documents */

function Documents({ served }: { served: Served }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('')
  const docs = served.documents
  const kinds = useMemo(() => [...new Set((docs?.items ?? []).map((d) => d.kind))], [docs])
  if (!docs) return null
  const shown = docs.items
    .filter((d) => !kind || d.kind === kind)
    .filter((d) => !q.trim() || [d.name, d.summary, d.added].some((x) => String(x ?? '').toLowerCase().includes(q.trim().toLowerCase())))
  return (
    <Section heading="Documents" note={docs.notOpenToYou ? undefined : `${plural(docs.total, 'document')}.`}>
      {docs.notOpenToYou ? (
        <Note>Documents here are shared by the people in this check-in, so you cannot open them from here.</Note>
      ) : docs.total === 0 ? (
        <Note tone="muted">{served.mayAdd ? 'No documents yet. Use Add to share one with your team.' : 'No documents have been shared with you yet.'}</Note>
      ) : (
        <Stack gap={10}>
          <FlexRow gap={8} wrap>
            <TextField value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents" aria-label="Search documents" />
            <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind of document">
              <option value="">All kinds</option>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
          </FlexRow>
          <Panel pad={false}>
            <RowList label="Documents">
              {shown.map((d) => (
                <Row key={d.id} columns="2fr 3fr 1fr" inset="panel">
                  <div data-gw-reference-document={d.id}>
                    <Text size="14" weight={600}>{d.name}</Text>
                    <Text size="13" ink="sub">{d.added}</Text>
                  </div>
                  <Text size="14">{d.summary ?? 'Not read yet.'}</Text>
                  <Text size="13" ink="sub">{d.whoCanSee}</Text>
                </Row>
              ))}
            </RowList>
          </Panel>
          {shown.length === 0 && <Note tone="muted">No document matches that.</Note>}
        </Stack>
      )}
    </Section>
  )
}

/* ----------------------------------------------------------------------------------------------------- Evidence */

const GROUPS = ['Orders and quotes', 'Payments', 'Photos', 'Other documents']

function Evidence({ groundId, served }: { groundId: string; served: Served }) {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [person, setPerson] = useState('')
  const [when, setWhen] = useState('any')
  const filtered = page !== 1 || !!q.trim() || !!group || !!person || when !== 'any'
  const asked = useQuery({
    queryKey: ['references-evidence', groundId, page, q.trim(), group, person, when],
    queryFn: () => groundsApi.referencesEvidence(groundId, { page, q: q.trim() || undefined, group: group || undefined, person: person || undefined, when }),
    enabled: filtered && !!served.evidence,
  })
  if (!served.evidence) return null
  const ev: AnEvidencePage = filtered && asked.data && 'items' in (asked.data as any) ? (asked.data as AnEvidencePage) : served.evidence
  const first = ev.total ? (ev.page - 1) * ev.pageSize + 1 : 0
  const last = Math.min(ev.page * ev.pageSize, ev.total)
  return (
    <Section heading="Evidence" note={`${plural(served.evidence.total, 'piece')} of evidence. ${served.evidenceSays}`}>
      <Stack gap={10}>
        <FlexRow gap={8} wrap>
          <TextField value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search evidence" aria-label="Search evidence" />
          {ev.people.length > 0 && (
            <Select value={person} onChange={(e) => { setPerson(e.target.value); setPage(1) }} aria-label="Person">
              <option value="">Everyone</option>
              {ev.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          )}
          <Select value={when} onChange={(e) => { setWhen(e.target.value); setPage(1) }} aria-label="When">
            <option value="any">Any time</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="quarter">This quarter</option>
          </Select>
          <Select value={group} onChange={(e) => { setGroup(e.target.value); setPage(1) }} aria-label="Kind of evidence">
            <option value="">All</option>
            {(served.evidenceGroups ?? GROUPS).map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </FlexRow>
        {ev.total === 0 ? (
          <Note tone="muted">{filtered ? 'No evidence matches that.' : 'No evidence yet. When someone adds a photo, slip or document as proof in their check-in, it shows here.'}</Note>
        ) : (
          <>
            <Panel pad={false}>
              <RowList label="Evidence">
                {ev.items.map((e) => (
                  <Row key={e.id} columns="2fr 2fr 1fr 1fr" inset="panel">
                    <div data-gw-evidence={e.id}>
                      <FlexRow gap={6} align="center" wrap>
                        <Text size="14" weight={600}>{e.readAs}</Text>
                        <Tag tone={e.countsAsProof ? 'proven' : 'plain'}>{e.countsAsProof ? 'Counts as proof' : 'Not proof'}</Tag>
                      </FlexRow>
                      {e.shows && <Text size="13" ink="sub">{e.shows}</Text>}
                    </div>
                    <Text size="14">{e.belongsTo}</Text>
                    <Text size="14">{e.addedBy}</Text>
                    <Text size="13" ink="sub">{e.addedOn}</Text>
                  </Row>
                ))}
              </RowList>
            </Panel>
            <FlexRow gap={8} align="center" wrap>
              <Note tone="muted">{`Newest first. ${first} to ${last} of ${ev.total.toLocaleString('en-GB')}.`}</Note>
              <Button kind="secondary" size="small" disabled={ev.page <= 1} onClick={() => setPage(ev.page - 1)}>Previous</Button>
              <Button kind="secondary" size="small" disabled={last >= ev.total} onClick={() => setPage(ev.page + 1)}>Next</Button>
            </FlexRow>
          </>
        )}
        <Note tone="muted">{`On the board, each ${served.itemWord} shows its own evidence, so nobody has to scroll this list to find it.`}</Note>
      </Stack>
    </Section>
  )
}

/* ---------------------------------------------------------------------------------------- Questions and answers */

function QuestionsAndAnswers({ served }: { served: Served }) {
  const qa = served.questions
  return (
    <Section heading="Questions and answers" note={qa.total ? `${plural(qa.total, 'question')}.` : undefined}>
      {qa.items.length === 0 ? (
        <Note tone="muted">{qa.emptySays}</Note>
      ) : (
        <Stack gap={8}>
          {qa.items.map((x, i) => (
            <Panel key={i}>
              <Text size="15" weight={600} as="p">{x.asked}</Text>
              <Text size="14" as="p">{x.answer}</Text>
              <Note tone="muted">{x.who}</Note>
            </Panel>
          ))}
        </Stack>
      )}
    </Section>
  )
}

/* ------------------------------------------------------------------------------------------------------- People */

/** "Only you see this" where nobody else may read People, else "Only you see this, and Otieno, the admin who set up this check-in" (21 October). The server names who. */
const onlyYouSeeThis = (alsoSeenBy?: string | null) => (alsoSeenBy?.trim() ? `Only you see this, and ${alsoSeenBy.trim()}.` : 'Only you see this.')

function People({ groundId, people, alsoSeenBy, onDone }: { groundId: string; people: NonNullable<Served['people']>; alsoSeenBy?: string; onDone: () => void }) {
  const direct = useTheDirectMorning()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<{ pid: string; kind: 'PERSON_NOTE' | 'HELP_WITH'; lineId: string | null; text: string } | null>(null)
  const save = useMutation({
    mutationFn: (e: NonNullable<typeof editing>) => (e.lineId
      ? groundsApi.changeAReference(groundId, e.lineId, { text: e.text })
      : groundsApi.addAReference(groundId, { kind: e.kind, text: e.text, aboutParticipantId: e.pid })),
    onSuccess: () => { setEditing(null); onDone() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. What you typed is still here, so try again.'),
  })
  const shown = people.filter((p) => !q.trim() || [p.name, p.role, p.note?.text, p.helpWith?.text].some((x) => String(x ?? '').toLowerCase().includes(q.trim().toLowerCase())))
  const editor = (p: (typeof people)[number], kind: 'PERSON_NOTE' | 'HELP_WITH', line: AReferenceLine | null) => (
    editing?.pid === p.participantId && editing.kind === kind ? (
      <Stack gap={6}>
        <TextArea value={editing.text} rows={2} onChange={(e) => setEditing({ ...editing, text: e.target.value })} aria-label={kind === 'PERSON_NOTE' ? `Your note on ${p.name}` : `What to help ${p.name} with`} />
        <FlexRow gap={8}>
          <Button kind="secondary" size="small" onClick={() => save.mutate(editing)} disabled={save.isPending || !editing.text.trim()}>Save</Button>
          <Button kind="secondary" size="small" onClick={() => setEditing(null)}>Cancel</Button>
        </FlexRow>
      </Stack>
    ) : (
      <FlexRow gap={8} align="center" wrap>
        <span>{line?.text ?? (kind === 'PERSON_NOTE' ? 'No note yet.' : 'Nothing yet.')}</span>
        <button type="button" className="gw-link t-small" onClick={() => setEditing({ pid: p.participantId, kind, lineId: line?.id ?? null, text: line?.text ?? '' })}>{line ? 'Change' : 'Add'}</button>
      </FlexRow>
    )
  )
  return (
    <Section heading="People" note={direct ? 'Your notes on each person. Their check-ins do not use them yet.' : `${onlyYouSeeThis(alsoSeenBy)} Your notes on each person. They never see them. Their check-ins do not use them yet.`}>
      <Stack gap={10}>
        {people.length > 5 && (
          <FlexRow gap={8} align="center" wrap>
            <TextField value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" aria-label="Search people" />
            <Note tone="muted">{`Showing ${shown.length} of ${plural(people.length, 'person', 'people')}.`}</Note>
          </FlexRow>
        )}
        {people.length === 0 && <Note tone="muted">Nobody else is in this check-in yet.</Note>}
        {shown.map((p) => (
          <Panel key={p.participantId}>
            <div data-gw-person-note={p.participantId}>
              <Stack gap={6}>
              <Text size="15" weight={600} as="p">{p.name}</Text>
              {p.role && <Text size="13" ink="sub" as="p">{p.role}</Text>}
              {editor(p, 'PERSON_NOTE', p.note)}
              <SubHeading as="h3">Help them with</SubHeading>
              {editor(p, 'HELP_WITH', p.helpWith)}
              {p.earlier.length > 0 && (
                <Folded summary="Your earlier notes" note="Written before References and resources. Their check-ins do not use these.">
                  <ul className="gwui-panel-list gwui-stack-6">{p.earlier.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </Folded>
              )}
              </Stack>
            </div>
          </Panel>
        ))}
      </Stack>
    </Section>
  )
}

/* ---------------------------------------------------------------------------------------------- Add, the lead's */

function AddSomething({ groundId, kind, onKind, people, alsoSeenBy, contextEnabled, onDone }: {
  alsoSeenBy?: string
  groundId: string
  kind: AReferenceKind | 'DOCUMENT' | 'PLAN'
  onKind: (k: AReferenceKind | 'DOCUMENT' | 'PLAN') => void
  people: NonNullable<Served['people']>
  contextEnabled: boolean
  onDone: () => void
}) {
  const direct = useTheDirectMorning()
  const [text, setText] = useState('')
  const [label, setLabel] = useState('')
  const [who, setWho] = useState('')
  const [reviewing, setReviewing] = useState<{ id: string; name: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const add = useMutation({
    mutationFn: () => groundsApi.addAReference(groundId, { kind: kind as AReferenceKind, text, ...(kind === 'KEY_FACT' ? { label } : {}), ...(kind === 'PERSON_NOTE' || kind === 'HELP_WITH' ? { aboutParticipantId: who } : {}) }),
    onSuccess: () => { toast.success('Added. Your team’s check-ins use it from now on.'); setText(''); setLabel(''); onDone() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. What you typed is still here, so try again.'),
  })
  const upload = useMutation({
    mutationFn: (f: File) => documentsApi.upload(groundId, f),
    onSuccess: (res: any, f) => { if (res?.id) setReviewing({ id: res.id, name: f.name }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That file did not upload. Nothing was added, so try again.'),
  })
  const aboutAPerson = kind === 'PERSON_NOTE' || kind === 'HELP_WITH'
  return (
    <Panel>
      <Stack gap={10}>
        <div>
          <FieldLabel htmlFor="gw-references-add-what">What to add</FieldLabel>
          <Select id="gw-references-add-what" value={kind} onChange={(e) => onKind(e.target.value as any)}>
            {ADDS.filter((a) => !(a.kind === 'PERSON_NOTE' || a.kind === 'HELP_WITH') || people.length > 0).map((a) => <option key={a.kind} value={a.kind}>{a.label}</option>)}
          </Select>
        </div>
        {kind === 'PLAN' && <FromAPlan groundId={groundId} />}
        {kind === 'DOCUMENT' && (
          reviewing ? (
            <AddADocument groundId={groundId} docId={reviewing.id} fileName={reviewing.name} contextEnabled={contextEnabled}
              onChooseAnother={() => { setReviewing(null); fileInput.current?.click() }} onClose={() => { setReviewing(null); onDone() }} />
          ) : (
            <FlexRow gap={8} align="center" wrap>
              <input ref={fileInput} type="file" accept={UPLOAD_ACCEPT_ATTR} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = '' }} />
              <Button kind="secondary" size="small" onClick={() => fileInput.current?.click()} disabled={upload.isPending}>{upload.isPending ? 'Adding…' : 'Choose a file'}</Button>
              <Note tone="muted">It starts private to you. You choose who can read it once it is in.</Note>
            </FlexRow>
          )
        )}
        {kind !== 'PLAN' && kind !== 'DOCUMENT' && (
          <>
            {aboutAPerson && (
              <div>
                <FieldLabel htmlFor="gw-references-add-who">Who it is about</FieldLabel>
                <Select id="gw-references-add-who" value={who} onChange={(e) => setWho(e.target.value)}>
                  <option value="">Choose a person</option>
                  {people.map((p) => <option key={p.participantId} value={p.participantId}>{p.name}</option>)}
                </Select>
                <Note tone="muted">{direct ? 'It shapes their check-ins.' : `${onlyYouSeeThis(alsoSeenBy)} It shapes their check-ins, and they never see it.`}</Note>
              </div>
            )}
            {kind === 'KEY_FACT' && (
              <div>
                <FieldLabel htmlFor="gw-references-add-label">What the fact is about</FieldLabel>
                <TextField id="gw-references-add-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="For example, Customers" maxLength={60} />
              </div>
            )}
            <div>
              <FieldLabel htmlFor="gw-references-add-text">In your words</FieldLabel>
              <TextArea id="gw-references-add-text" value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={600} />
            </div>
            <FlexRow gap={8}>
              <Button kind="secondary" size="small" onClick={() => add.mutate()} disabled={add.isPending || !text.trim() || (aboutAPerson && !who) || (kind === 'KEY_FACT' && !label.trim())}>
                {add.isPending ? 'Saving…' : 'Save'}
              </Button>
            </FlexRow>
          </>
        )}
      </Stack>
    </Panel>
  )
}
