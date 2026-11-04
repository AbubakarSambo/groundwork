import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { spendRulesApi, type AnAmountsSteps, type ApprovalRole, type AStepRule, type TheReceiptRule, type TheSpendRules } from '@/api/suites'
import { Section, Panel, Button, Note, Select, TextField, Stack } from '@/components/gw/ui'

/**
 * APPROVAL STEPS BY AMOUNT, SET ON THE SPENDING PAGE (Hafsah, 26 October 2026: "approvals in steps must work without Ask").
 *
 * An admin, or whoever looks after finance, sets for each amount who approves, in order, by role or by one person: "over KES 10,000,
 * Wanjiru approves". Each step is shown and can be changed or taken out. It is the one setting that says who approves a request to
 * spend (the spending rules' steps by amount): the Suites page's settings, Ask and the policy board fill in the same rows. The words
 * above the steps are the server's own (`said`): the whole route, finance's part after the last approval, and the receipt rule, so
 * nothing on this page says something the routing does not do. The receipt rule is set here too.
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
interface Draft { above: string; steps: AStepRule[][] }

/** A rule as a select's value: the role's key, or "named:" and the person's id. */
const valueOf = (r: AStepRule) => (typeof r === 'object' ? `named:${r.named}` : r)
const ruleOf = (v: string): AStepRule => (v.startsWith('named:') ? { named: v.slice(6) } : (v as ApprovalRole))
const draftOf = (d: TheSpendRules) => (d.rules.thresholds ?? []).map((t) => ({ above: String(t.above), steps: t.steps.map((s) => [...s]) }))

/** The receipt rule as one choice: none, or a receipt or a quote for every request. A rule set above an amount elsewhere is kept as it is until changed here. */
const RECEIPT_SAID = { none: 'No receipt or quote is needed', receipt: 'Every request needs a receipt', quote: 'Every request needs a quote' } as const
type ReceiptChoice = keyof typeof RECEIPT_SAID | 'kept'

export function ApprovalStepsByAmount({ currency }: { currency: string | null }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['spend-rules'], queryFn: spendRulesApi.get, retry: false })
  const [draft, setDraft] = useState<Draft[] | null>(null)
  useEffect(() => {
    if (q.data && draft === null) setDraft(draftOf(q.data))
  }, [q.data, draft])
  const save = useMutation({
    mutationFn: (thresholds: AnAmountsSteps[]) => spendRulesApi.setThresholds(thresholds),
    onSuccess: (res) => {
      qc.setQueryData(['spend-rules'], res)
      qc.invalidateQueries({ queryKey: ['suite-spend'] })
      setDraft(draftOf(res))
      toast.success('The approval steps are saved.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The steps did not save. Try again.'),
  })
  const receipt = useMutation({
    mutationFn: (evidence: TheReceiptRule | null) => spendRulesApi.setReceiptRule(evidence),
    onSuccess: (res) => { qc.setQueryData(['spend-rules'], res); toast.success('The receipt rule is saved.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The receipt rule did not save. Try again.'),
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
  const ev = q.data.rules.evidence
  const receiptNow: ReceiptChoice = !ev ? 'none' : ev.above === 0 ? ev.what : 'kept'

  return (
    <Section heading="Who approves, by amount" note="In order. A request goes to the next step only after the one before says yes.">
      <Panel>
        <Stack gap={12}>
          {q.data.said.map((s) => <p key={s} className="gwui-panel-text">{s}</p>)}
          <div className="gwui-invite-actions">
            <label className="gwui-panel-text" htmlFor="receipt-rule">Does a request need a receipt or a quote?</label>
            <Select id="receipt-rule" aria-label="Does a request need a receipt or a quote?" value={receiptNow} disabled={receipt.isPending}
              onChange={(e) => { const v = e.target.value as ReceiptChoice; if (v !== 'kept') receipt.mutate(v === 'none' ? null : { what: v, above: 0 }) }}>
              {receiptNow === 'kept' && <option value="kept">{`Keep the rule as it is said above`}</option>}
              {(Object.keys(RECEIPT_SAID) as (keyof typeof RECEIPT_SAID)[]).map((k) => <option key={k} value={k}>{RECEIPT_SAID[k]}</option>)}
            </Select>
          </div>
          {draft.map((d, i) => (
            <div key={i} className="gwui-ruled-row" aria-label={`Steps over ${money(d.above)}`}>
              <Stack gap={8}>
                <label className="gwui-panel-text" htmlFor={`over-${i}`}>{`Over ${currency ?? 'the amount'}`}</label>
                <TextField id={`over-${i}`} inputMode="numeric" value={d.above} onChange={(e) => change(i, { above: e.target.value.replace(/[^\d]/g, '') })} aria-label={`Amount ${i + 1}`} />
                {d.steps.map((s, k) => (
                  <div key={k} className="gwui-invite-actions">
                    <label className="gwui-panel-text" htmlFor={`step-${i}-${k}`}>{k === 0 ? 'First,' : 'Then,'}</label>
                    <Select id={`step-${i}-${k}`} aria-label={`Step ${k + 1} over ${money(d.above)}`} value={valueOf(s[0])} onChange={(e) => change(i, { steps: d.steps.map((x, m) => (m === k ? [ruleOf(e.target.value), ...x.slice(1)] : x)) })}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_SAID[r]}</option>)}
                      {q.data.people.map((p) => <option key={p.id} value={`named:${p.id}`}>{p.name}</option>)}
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
            {draft.length < MAX_AMOUNTS && <Button kind="secondary" size="small" onClick={() => setDraft([...draft, { above: '', steps: [['manager']] }])}>Add an amount</Button>}
            <Button kind="primary" size="small" disabled={!!problem || save.isPending} onClick={() => save.mutate(draft.map((d) => ({ above: Number(d.above), steps: d.steps })))}>
              {save.isPending ? 'Saving…' : 'Save the steps'}
            </Button>
          </div>
        </Stack>
      </Panel>
    </Section>
  )
}

/**
 * THE WHOLE ROUTE, ON THE SUITES PAGE'S SPENDING CARD (use-case walk of 2 November: "Why are there settings and a board?"). The card's
 * two answers are the lowest of the steps by amount, so after Save the card says what is set: who approves at each amount, what finance
 * does after the last approval, and the receipt rule, in the server's own words. The steps and the receipt rule are changed on the
 * spending page, in the one editor above.
 */
export function TheSpendingRoute() {
  const q = useQuery({ queryKey: ['spend-rules'], queryFn: spendRulesApi.get, retry: false })
  if (q.isError || !q.data) return null
  return (
    <div aria-label="Who approves spending">
      {q.data.said.map((s) => <p key={s} className="gwui-panel-text">{s}</p>)}
    </div>
  )
}
