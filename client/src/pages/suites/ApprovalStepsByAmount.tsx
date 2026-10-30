import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { spendRulesApi, type AnAmountsSteps, type ApprovalRole } from '@/api/suites'
import { Section, Panel, Button, Note, Select, TextField, Stack } from '@/components/gw/ui'

/**
 * APPROVAL STEPS BY AMOUNT, SET ON THE SPENDING PAGE (Hafsah, 26 October 2026: "approvals in steps must work without Ask").
 *
 * An admin, or whoever looks after finance, sets for each amount who approves, in order, by role: "over KES 20,000, finance first, then
 * their manager". Each step is shown and can be changed or taken out. It is the one setting (the spending rules' thresholds) that Ask
 * and the policy board also fill in, so all three read and write the same thing. A request then goes through each step in order.
 */
export const ROLE_SAID: Record<ApprovalRole, string> = {
  manager: 'Their manager',
  departmentHead: 'The head of their team',
  budgetOwner: 'Whoever holds their team’s budget',
  finance: 'Whoever looks after finance',
  hr: 'Whoever looks after HR',
  chiefExecutive: 'The chief executive',
  admin: 'An admin',
}
const ROLES = Object.keys(ROLE_SAID) as ApprovalRole[]
const MAX_AMOUNTS = 5
const MAX_STEPS = 5

/** What is kept, as the editor holds it: the amount as typed, and each step's rules (only the first is chosen here). */
interface Draft { above: string; steps: ApprovalRole[][] }

export function ApprovalStepsByAmount({ currency }: { currency: string | null }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['spend-rules'], queryFn: spendRulesApi.get, retry: false })
  const [draft, setDraft] = useState<Draft[] | null>(null)
  useEffect(() => {
    if (q.data && draft === null) setDraft((q.data.rules.thresholds ?? []).map((t) => ({ above: String(t.above), steps: t.steps.map((s) => [...s]) })))
  }, [q.data, draft])
  const save = useMutation({
    mutationFn: (thresholds: AnAmountsSteps[]) => spendRulesApi.setThresholds(thresholds),
    onSuccess: (res) => {
      qc.setQueryData(['spend-rules'], res)
      qc.invalidateQueries({ queryKey: ['suite-spend'] })
      setDraft((res.rules.thresholds ?? []).map((t) => ({ above: String(t.above), steps: t.steps.map((s) => [...s]) })))
      toast.success('The approval steps are saved.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The steps did not save. Try again.'),
  })
  /* Only an admin, or whoever looks after finance, is served the rules; anybody else sees nothing here. */
  if (q.isError || !q.data || draft === null) return null

  const money = (n: string) => `${currency ? `${currency} ` : ''}${Number(n || 0).toLocaleString('en-US')}`
  const change = (i: number, next: Partial<Draft>) => setDraft(draft.map((d, j) => (j === i ? { ...d, ...next } : d)))
  const amounts = draft.map((d) => Number(d.above))
  const problem = draft.some((d) => !(Number(d.above) > 0)) ? 'Give each amount as a number above nothing.'
    : new Set(amounts).size !== amounts.length ? 'Each amount can be set only once.'
    : draft.some((d) => d.steps.length === 0) ? 'Each amount needs at least one step.'
    : null
  const said = q.data.said.filter((s) => /^A request (?:to spend )?over /.test(s) || /follows the highest one/.test(s))

  return (
    <Section heading="Who approves, by amount" note="In order. A request goes to the next step only after the one before says yes.">
      <Panel>
        <Stack gap={12}>
          {said.length
            ? said.map((s) => <p key={s} className="gwui-panel-text">{s}</p>)
            : <p className="gwui-panel-text">No steps are set by amount, so a request goes to one person: their manager up to the limit, and above it the person the suite names.</p>}
          {draft.map((d, i) => (
            <div key={i} className="gwui-ruled-row" aria-label={`Steps over ${money(d.above)}`}>
              <Stack gap={8}>
                <label className="gwui-panel-text" htmlFor={`over-${i}`}>{`Over ${currency ?? 'the amount'}`}</label>
                <TextField id={`over-${i}`} inputMode="numeric" value={d.above} onChange={(e) => change(i, { above: e.target.value.replace(/[^\d]/g, '') })} aria-label={`Amount ${i + 1}`} />
                {d.steps.map((s, k) => (
                  <div key={k} className="gwui-invite-actions">
                    <label className="gwui-panel-text" htmlFor={`step-${i}-${k}`}>{k === 0 ? 'First,' : 'Then,'}</label>
                    <Select id={`step-${i}-${k}`} aria-label={`Step ${k + 1} over ${money(d.above)}`} value={s[0]} onChange={(e) => change(i, { steps: d.steps.map((x, m) => (m === k ? [e.target.value as ApprovalRole, ...x.slice(1)] : x)) })}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_SAID[r]}</option>)}
                    </Select>
                    {d.steps.length > 1 && <Button kind="quiet" size="small" onClick={() => change(i, { steps: d.steps.filter((_, m) => m !== k) })}>{`Take out step ${k + 1}`}</Button>}
                  </div>
                ))}
                <div className="gwui-invite-actions">
                  {d.steps.length < MAX_STEPS && <Button kind="quiet" size="small" onClick={() => change(i, { steps: [...d.steps, ['admin']] })}>Add a step</Button>}
                  <Button kind="quiet" size="small" onClick={() => setDraft(draft.filter((_, j) => j !== i))}>Take out this amount</Button>
                </div>
              </Stack>
            </div>
          ))}
          {problem && <Note tone="error">{problem}</Note>}
          <div className="gwui-invite-actions">
            {draft.length < MAX_AMOUNTS && <Button kind="secondary" size="small" onClick={() => setDraft([...draft, { above: '', steps: [['finance'], ['manager']] }])}>Add an amount</Button>}
            <Button kind="primary" size="small" disabled={!!problem || save.isPending} onClick={() => save.mutate(draft.map((d) => ({ above: Number(d.above), steps: d.steps })))}>
              {save.isPending ? 'Saving…' : 'Save the steps'}
            </Button>
          </div>
        </Stack>
      </Panel>
    </Section>
  )
}
