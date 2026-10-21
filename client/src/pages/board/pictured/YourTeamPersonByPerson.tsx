import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Section, Panel, Note, Callout, Stack, FlexRow, FoldedLine, Text, Button, FieldLabel, TextArea, TextField, Select } from '@/components/gw/ui'
import { boardApi, type YourTeamServed, type APersonOnYourBoard, type AnActionOnAPerson } from '@/api/board'

/**
 * YOUR TEAM, PERSON BY PERSON, ON THE LEAD'S BOARD (Groundwork does the managing, part 2; api board/your-team-person-by-person.ts).
 *
 * For the lead's monthly look: one part for each person, with where they stand and the evidence beside it, what they delivered with
 * proof, their record and the coaching Groundwork gave them, what she already did, and her four one-tap actions. The server serves
 * `yourTeam` to the lead who runs the check-in alone, where her organisation's direct morning is on, and builds where they stand and
 * the record only where judgements of a person are on; with it absent nothing here is drawn. Every sentence is the server's. Each tap
 * says what it does before she confirms it, and the server refuses anybody but her whatever is drawn here.
 */
export function YourTeamPersonByPerson({ groundId, team }: { groundId: string; team: YourTeamServed }) {
  return (
    <div data-your-team>
      <Section heading={team.heading} note={team.note}>
        <Stack gap={12}>
          {team.people.map((p) => <ThePerson key={p.participantId} groundId={groundId} p={p} />)}
        </Stack>
      </Section>
    </div>
  )
}

function ThePerson({ groundId, p }: { groundId: string; p: APersonOnYourBoard }) {
  const otherCoaching = (p.record?.coaching ?? []).filter((c) => !p.whereTheyStand?.evidence.includes(c.said))
  return (
    <Panel heading={p.name}>
      <Stack gap={8}>
        {p.role && <Note tone="muted">{p.role}</Note>}
        {p.whereTheyStand && (
          <div data-where-they-stand={p.whereTheyStand.standing}>
            <Text size="14-5" as="p">{p.whereTheyStand.says}</Text>
            {p.whereTheyStand.evidence.length > 0 && (
              <ul className="gwui-panel-list">
                {p.whereTheyStand.evidence.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
        <FoldedLine name={p.delivered.heading}>
          {p.delivered.empty ? <Note tone="muted">{p.delivered.empty}</Note> : (
            <ul className="gwui-panel-list">
              {[...p.delivered.proven, ...p.delivered.onlySaid].map((l) => <li key={l}>{l}</li>)}
            </ul>
          )}
        </FoldedLine>
        {p.record && p.record.parts.map((part) => (
          /* A sentence already beside where they stand is not said again as the fold's fact. */
          <FoldedLine key={part.heading} name={part.heading} fact={p.whereTheyStand?.evidence.includes(part.says) ? undefined : part.says}>
            <Stack gap={8}>
              {part.toChange && <Callout tone="info">{part.toChange}</Callout>}
              {part.evidence.length > 0 && (
                <ul className="gwui-panel-list">
                  {part.evidence.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
            </Stack>
          </FoldedLine>
        ))}
        {/* The coaching Groundwork gave, when, and whether it worked; one already beside where they stand is not said again. */}
        {p.record && (p.record.coaching.length === 0 || otherCoaching.length > 0) && (
          <FoldedLine name="Coaching from Groundwork">
            {p.record.coaching.length === 0 ? <Note tone="muted">{p.record.coachingEmpty}</Note> : (
              <ul className="gwui-panel-list">
                {otherCoaching.map((c) => (
                  <li key={c.said}>
                    <span>{c.said}</span>
                    <Note tone="muted">{c.since}</Note>
                  </li>
                ))}
              </ul>
            )}
          </FoldedLine>
        )}
        {p.fromYou.length > 0 && (
          <FoldedLine name="What you have done" defaultOpen>
            <ul className="gwui-panel-list">
              {p.fromYou.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </FoldedLine>
        )}
        <TheActions groundId={groundId} p={p} />
      </Stack>
    </Panel>
  )
}

function TheActions({ groundId, p }: { groundId: string; p: APersonOnYourBoard }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState<AnActionOnAPerson | null>(null)
  const [text, setText] = useState('')
  const [itemId, setItemId] = useState('')
  const [due, setDue] = useState('')
  const [to, setTo] = useState('')
  const [said, setSaid] = useState<string | null>(null)
  const go = useMutation({
    mutationFn: (a: AnActionOnAPerson) => boardApi.actOnAPerson(groundId, p.participantId, {
      kind: a.kind,
      ...(a.kind === 'praise' || a.kind === 'plan' ? { text } : {}),
      ...(a.kind === 'deadline' ? { itemId, due } : {}),
      ...(a.kind === 'reassign' ? { itemId, toParticipantId: to } : {}),
    }),
    onSuccess: (r) => {
      setSaid(r.says)
      setOpen(null)
      qc.invalidateQueries({ queryKey: ['board', groundId] })
    },
    onError: (e: any) => setSaid(String(e?.response?.data?.message ?? 'That could not be done. Try again.')),
  })
  const start = (a: AnActionOnAPerson) => {
    setSaid(null)
    setOpen(a)
    setText(a.suggested ?? '')
    setItemId(a.items?.[0]?.id ?? '')
    setTo(a.to?.[0]?.participantId ?? '')
    setDue('')
  }
  /* A deadline or a reassignment needs a record of theirs to be done on. */
  const usable = p.actions.filter((a) => (a.kind !== 'deadline' && a.kind !== 'reassign') || (a.items ?? []).length > 0)
  const ready = !!open && (open.kind === 'praise' || open.kind === 'plan' ? text.trim().length > 0 : open.kind === 'deadline' ? !!itemId && /^\d{4}-\d{2}-\d{2}$/.test(due) : !!itemId && !!to)
  const field = `act-${p.participantId}`
  return (
    <div data-actions-for={p.participantId}>
      <FlexRow gap={8} wrap>
        {usable.map((a) => (
          <Button key={a.kind} kind="secondary" onClick={() => start(a)} aria-expanded={open?.kind === a.kind}>{a.label}</Button>
        ))}
      </FlexRow>
      {said && <Note role="status">{said}</Note>}
      {open && (
        <Stack gap={8}>
          <Callout tone="info">{open.does}</Callout>
          {(open.kind === 'praise' || open.kind === 'plan') && (
            <>
              <FieldLabel htmlFor={`${field}-text`}>{open.kind === 'praise' ? 'What you want to say' : 'What you want to help with'}</FieldLabel>
              <TextArea id={`${field}-text`} value={text} onChange={(e) => setText(e.target.value)} rows={3} />
            </>
          )}
          {(open.kind === 'deadline' || open.kind === 'reassign') && (
            <>
              <FieldLabel htmlFor={`${field}-item`}>Which record</FieldLabel>
              <Select id={`${field}-item`} value={itemId} onChange={(e) => setItemId(e.target.value)}>
                {(open.items ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </Select>
            </>
          )}
          {open.kind === 'deadline' && (
            <>
              <FieldLabel htmlFor={`${field}-due`}>The day it is due</FieldLabel>
              <TextField id={`${field}-due`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </>
          )}
          {open.kind === 'reassign' && (
            <>
              <FieldLabel htmlFor={`${field}-to`}>Who has it now</FieldLabel>
              <Select id={`${field}-to`} value={to} onChange={(e) => setTo(e.target.value)}>
                {(open.to ?? []).map((x) => <option key={x.participantId} value={x.participantId}>{x.name}</option>)}
              </Select>
            </>
          )}
          <FlexRow gap={8}>
            <Button kind="primary" disabled={!ready || go.isPending} onClick={() => open && go.mutate(open)}>{go.isPending ? 'Saving' : 'Confirm'}</Button>
            <Button kind="quiet" onClick={() => setOpen(null)}>Not now</Button>
          </FlexRow>
        </Stack>
      )}
    </div>
  )
}
