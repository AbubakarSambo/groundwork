import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companyApi, type AGoalYouMayChange, type AGoalAsGiven, type TheGoalsYouMayChange } from '@/api/company'
import { useAuthStore } from '@/stores/auth'
import { whatSuccessLooksLike } from './CompanyPage'
import { Section, Panel, Button, Note, Empty, RowList, Row, SubHeading, FieldLabel, TextField, Select } from '@/components/gw/ui'

/**
 * ADDING A GOAL TO THE DESK, AND TYING CHECK-INS TO IT (Hafsah, 21 November 2026: "For desk: adding strategy or goals and tying them
 * to a check-in").
 *
 * WHO MAY IS THE SERVER'S (GET /company/goals, api/src/modules/grounds/a-goal-on-the-desk.ts): an admin adds and changes any goal and
 * ties any check-in; a lead adds a goal of their own, changes the goals they own, and ties the check-ins they run. Everybody else is
 * served `mayChange: false`, and this section is not drawn for them: they read the goals, and what feeds each, in "Is the strategy
 * moving?" above, as before. The server refuses a change from anybody it did not offer one to, whatever this screen shows.
 *
 * ONE SOURCE. A goal is the organisation's own objective, the same row the Desk's priorities are read from; a check-in feeds it through
 * the one field the Desk already reads. Saving here changes those, and the Desk is read again, so the priorities above say the same.
 */
export function TheGoalsYouCanChange() {
  const user = useAuthStore(s => s.user)
  const { data } = useQuery({ queryKey: ['company-goals'], queryFn: companyApi.goals, enabled: !!user && (user.role === 'ADMIN' || user.role === 'LEAD'), retry: false, staleTime: 30_000 })
  const [open, setOpen] = useState<string | null>(null)
  if (!data?.mayChange) return null
  const goals = data.goals ?? []
  const heading = data.mayChooseOwner ? 'Add or change a goal' : 'Your goals, and the check-ins that feed them'
  return (
    <Section heading={heading} action={open ? undefined : <Button kind="secondary" size="small" onClick={() => setOpen('new')}>Add a goal</Button>}>
      {open === 'new' && <AGoalForm data={data} onDone={() => setOpen(null)} />}
      {goals.length === 0 ? (
        <Empty>{data.mayChooseOwner ? 'There are no goals on the Desk yet. Add the first one, and choose the check-ins that feed it.' : 'You do not own a goal on the Desk yet. Add one, and choose which of your check-ins feed it.'}</Empty>
      ) : (
        <RowList label={heading}>
          {goals.map(g => (
            <Row key={g.id} columns="minmax(0, 1fr) auto">
              <div>
                <b>{g.title}</b>
                <p className="gwui-panel-text">{aGoalsLine(g)}</p>
                {open === g.id && <AGoalForm data={data} goal={g} onDone={() => setOpen(null)} />}
              </div>
              {open !== g.id && <button type="button" className="gwui-plain-link gwui-tap-44" onClick={() => setOpen(g.id)} aria-label={`Change ${g.title}`}>Change it</button>}
            </Row>
          ))}
        </RowList>
      )}
    </Section>
  )
}

/** "Wairimu Njoroge is responsible for this. Fed by Sales team, Q4." in plain sentences. */
export function aGoalsLine(g: AGoalYouMayChange): string {
  const who = g.owner ? `${g.owner} is responsible for this.` : 'Nobody is responsible for this yet.'
  return [who, g.fedBy, whatSuccessLooksLike(g.measure, g.target)].filter(Boolean).join(' ')
}

function AGoalForm({ data, goal, onDone }: { data: TheGoalsYouMayChange; goal?: AGoalYouMayChange; onDone: () => void }) {
  const qc = useQueryClient()
  const key = goal?.id ?? 'new'
  const wordsHere = goal ? goal.wordsChangedHere : true
  const [title, setTitle] = useState(goal?.title ?? '')
  const [measure, setMeasure] = useState(goal?.measure ?? '')
  const [target, setTarget] = useState(goal?.target ?? '')
  const [ownerId, setOwnerId] = useState(goal?.ownerId ?? '')
  const [chosen, setChosen] = useState<Set<string>>(new Set((goal?.checkIns ?? []).map(c => c.id)))
  const save = useMutation({
    mutationFn: () => {
      const given: AGoalAsGiven = { checkInIds: [...chosen] }
      if (wordsHere) {
        given.title = title
        if (data.mayChooseOwner) { given.measure = measure.trim() || null; given.target = target.trim() || null; given.ownerId = ownerId || null }
      }
      return goal ? companyApi.changeGoal(goal.id, given) : companyApi.addGoal(given)
    },
    onSuccess: (served) => {
      qc.setQueryData(['company-goals'], served)
      qc.invalidateQueries({ queryKey: ['company'] })
      onDone()
    },
  })
  const said = (save.error as { response?: { data?: { message?: string | string[] } } } | null)?.response?.data?.message
  const checkIns = data.checkIns ?? []
  const toggle = (id: string) => setChosen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <Panel as="section" aria-label={goal ? `Change ${goal.title}` : 'Add a goal'}>
      <SubHeading as="h3">{goal ? 'Change this goal' : 'Add a goal'}</SubHeading>
      {wordsHere ? (
        <>
          <FieldLabel htmlFor={`goal-title-${key}`}>What the goal is</FieldLabel>
          <TextField id={`goal-title-${key}`} value={title} onChange={e => setTitle(e.target.value)} placeholder="For example, Grow revenue from supermarkets by a third" />
          {data.mayChooseOwner && (
            <>
              <FieldLabel htmlFor={`goal-measure-${key}`}>How it is measured</FieldLabel>
              <TextField id={`goal-measure-${key}`} value={measure} onChange={e => setMeasure(e.target.value)} placeholder="For example, revenue from supermarkets" />
              <FieldLabel htmlFor={`goal-target-${key}`}>The target</FieldLabel>
              <TextField id={`goal-target-${key}`} value={target} onChange={e => setTarget(e.target.value)} placeholder="For example, 3 million shillings by March" />
              <FieldLabel htmlFor={`goal-owner-${key}`}>Who is responsible for it</FieldLabel>
              <Select id={`goal-owner-${key}`} value={ownerId} onChange={e => setOwnerId(e.target.value)}>
                <option value="">Nobody yet</option>
                {(data.people ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </>
          )}
          {!data.mayChooseOwner && !goal && <p className="gwui-panel-text-muted">This goal will be in your name.</p>}
        </>
      ) : (
        <p className="gwui-panel-text">This goal came from your organisation’s own system, so its words are changed there. You can still choose which check-ins feed it.</p>
      )}
      <fieldset className="gwui-suite-q">
        <legend className="gwui-field-label">{data.mayChooseOwner ? 'The check-ins that feed it' : 'Which of your check-ins feed it'}</legend>
        {checkIns.length === 0 && <p className="gwui-panel-text-muted">{data.mayChooseOwner ? 'There are no check-ins in the organisation yet.' : 'You do not run a check-in yet.'}</p>}
        {checkIns.map(c => {
          const elsewhere = c.feeds && c.feeds !== goal?.title ? ` It feeds ${c.feeds} now, so choosing it here moves it to this goal.` : ''
          return (
            <p key={c.id} className="gwui-panel-text">
              <label><input type="checkbox" checked={chosen.has(c.id)} onChange={() => toggle(c.id)} /> {c.label}.{elsewhere}</label>
            </p>
          )
        })}
      </fieldset>
      <div className="gwui-sentence-row">
        <Button kind="primary" onClick={() => save.mutate()} disabled={(wordsHere && !title.trim()) || save.isPending}>
          {save.isPending ? 'Saving it' : goal ? 'Save the changes' : 'Add it to the Desk'}
        </Button>
        <Button kind="quiet" onClick={onDone}>Cancel</Button>
      </div>
      {save.isError && <Note tone="error">{Array.isArray(said) ? said.join(' ') : said || 'That was not saved, and nothing has changed. Try again.'}</Note>}
    </Panel>
  )
}
