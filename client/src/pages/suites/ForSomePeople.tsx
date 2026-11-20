import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { suitesApi, type ASetting, type WhoKind } from '@/api/suites'
import { Button, FieldLabel, Note, Select, TextField } from '@/components/gw/ui'

/**
 * DIFFERENT FOR SOME PEOPLE (Batch S, S1). A suite's number is the same for everyone unless an admin sets another for a job
 * title, an app role, a team or one person; the most specific wins. The sentences are the server's (who-a-rule-is-for.ts), with
 * who each covers today by name. Ask sets the same numbers when told, for example, "managers get 25 days, field agents 18".
 */
const SETTING_OF: Record<string, ASetting> = { leave: 'leave.days', time: 'time.hoursAWeek', spend: 'spend.limit' }
const NUMBER_ASK: Record<ASetting, string> = {
  'leave.days': 'How many days of leave a year?',
  'time.hoursAWeek': 'How many hours a week?',
  'spend.limit': 'Up to what amount does their manager approve on their own?',
}
const KINDS: { kind: WhoKind; label: string }[] = [
  { kind: 'title', label: 'A job title' },
  { kind: 'team', label: 'A team' },
  { kind: 'person', label: 'One person' },
  { kind: 'appRole', label: 'Everyone with an app role' },
]
const APP_ROLES = [{ value: 'ADMIN', label: 'Admins' }, { value: 'LEAD', label: 'Leads' }, { value: 'MEMBER', label: 'Members' }]

export function ForSomePeople({ suite }: { suite: string }) {
  const setting = SETTING_OF[suite]
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['suites-for-whom'], queryFn: suitesApi.forWhom, retry: false, enabled: !!setting })
  const [kind, setKind] = useState<WhoKind>('title')
  const [value, setValue] = useState('')
  const [n, setN] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: suitesApi.setForWhom,
    onSuccess: (page) => { setProblem(null); setValue(''); setN(''); qc.setQueryData(['suites-for-whom'], page); qc.invalidateQueries({ queryKey: ['suite-setup'] }) },
    onError: (e: any) => setProblem(e?.response?.data?.message || 'That did not go through, and nothing has changed. Try again.'),
  })
  const mine = data?.settings.find(x => x.setting === setting)
  if (!setting || !data || !mine) return null
  const choices = kind === 'title' ? data.titles.map(t => ({ value: t, label: t }))
    : kind === 'team' ? data.teams.map(t => ({ value: t, label: t }))
      : kind === 'person' ? data.people.map(p => ({ value: p.id, label: p.name }))
        : APP_ROLES
  const id = `for-some-${suite}`
  return (
    <div className="gwui-suite-ask" aria-label="Different for some people">
      <p className="gwui-panel-text"><b>Different for some people</b></p>
      {mine.said.length === 0
        ? <p className="gwui-panel-text">The same number holds for everyone. You can set another for a job title, a team, an app role or one person, and the most specific one wins.</p>
        : mine.said.map((line, i) => (
          <p key={line} className="gwui-panel-text">
            {line}{' '}
            <Button kind="quiet" size="small" disabled={save.isPending} onClick={() => save.mutate({ setting, who: mine.exceptions[i].who, value: null })}>Remove</Button>
          </p>
        ))}
      <form onSubmit={e => { e.preventDefault(); if (value && n.trim() !== '') save.mutate({ setting, who: { kind, value }, value: Number(n) }) }}>
        <div className="gwui-suite-q">
          <FieldLabel htmlFor={`${id}-kind`}>Who is it for?</FieldLabel>
          <Select id={`${id}-kind`} value={kind} onChange={e => { setKind(e.target.value as WhoKind); setValue('') }}>
            {KINDS.map(k => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </Select>
        </div>
        <div className="gwui-suite-q">
          <FieldLabel htmlFor={`${id}-value`}>Which one?</FieldLabel>
          <Select id={`${id}-value`} value={value} onChange={e => setValue(e.target.value)}>
            <option value="">Choose one</option>
            {choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </div>
        <div className="gwui-suite-q">
          <FieldLabel htmlFor={`${id}-n`}>{NUMBER_ASK[setting]}</FieldLabel>
          <TextField id={`${id}-n`} type="number" inputMode="numeric" min={0} value={n} onChange={e => setN(e.target.value)} />
        </div>
        <div className="gwui-edge-acts">
          <Button kind="secondary" size="small" type="submit" disabled={!value || n.trim() === '' || save.isPending}>Save it for them</Button>
        </div>
      </form>
      {problem && <Note tone="error">{problem}</Note>}
    </div>
  )
}
