import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { fileARequestApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whatFilingARequestSays } from '@/lib/file-a-request-error'
import { Page, PageTitle, Panel, FieldLabel, TextField, Select, Button, Note } from '@/components/gw/ui'

/**
 * ASK TO SPEND MONEY, FROM ITS OWN FORM (request 165, Hafsah 6 October;
 * renamed from "Create a payment request" in the live walk at a hundred people, fault 5: everywhere
 * else in the product already says "request to spend" ("Your request to spend KES 12,000..."), so
 * the one page that lets somebody start one used a different name for the same thing.
 * docs/requests-to-engine.md; docs/answers-from-engine.md, "request 165, the forms for leave and
 * spending").
 *
 * Reached from the check-in's own "Create request" button (anchor pieces 26/27,
 * `RequestOffer.tsx`'s `OpenTheRequest`), which carries what was read from the person's own words
 * in router state as `prefill: { amount?, what?, currency? }`. With no prefill, every field starts
 * empty.
 *
 * `GET /suites/spend/form` is open to anybody in the organisation who is not a guest, and answers
 * the currency, what the organisation calls a category, and the categories themselves - never a
 * limit, a threshold or who approves, and the form never writes a currency or a limit of its own.
 * With the suite off, that read refuses with the board's own off sentence, shown with no fields.
 *
 * On success `POST /suites/spend/requests` answers `{ id, says }`; the person goes to
 * "Your requests" (`/suite/mine`) and reads `says`. A refusal is read in the server's own words
 * (`whatFilingARequestSays`).
 */
export function SpendRequestNewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const prefill = (location.state as { prefill?: { amount?: number; what?: string; currency?: string } | null } | null)?.prefill

  const [amount, setAmount] = useState(prefill?.amount != null ? String(prefill.amount) : '')
  const [what, setWhat] = useState(prefill?.what ?? '')
  const [category, setCategory] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  const form = useQuery({ queryKey: ['spend-form'], queryFn: fileARequestApi.spendForm, retry: false })
  const offSentence = form.isError ? whatFilingARequestSays(form.error, user?.organizationName) : null

  const send = useMutation({
    mutationFn: () => fileARequestApi.spending({ amount: Number(amount), what: what.trim(), ...(category ? { category } : {}) }),
    onSuccess: (res) => navigate('/suite/mine', { state: { sentMessage: res?.says ?? 'Your payment request has been sent.' } }),
    onError: (e: unknown) => setProblem(whatFilingARequestSays(e, user?.organizationName)),
  })

  const parsedAmount = Number(amount)
  const canSend = amount.trim() !== '' && !Number.isNaN(parsedAmount) && parsedAmount > 0 && what.trim() !== '' && !send.isPending && !offSentence

  const categoryLabel = form.data?.categoryCalled
    ? form.data.categoryCalled.charAt(0).toUpperCase() + form.data.categoryCalled.slice(1)
    : 'Category'

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Your requests', to: '/suite/mine' }, { label: 'Ask to spend money' }]}
        title="Ask to spend money"
        subtitle="Say how much, and what it is for, and Groundwork will send it to the right person."
      />
      <Panel>
        {offSentence ? (
          <Note tone="error">{offSentence}</Note>
        ) : (
          <form className="gwui-suite-ask-alone" onSubmit={e => { e.preventDefault(); if (canSend) send.mutate() }}>
            <div className="gwui-suite-q">
              <FieldLabel htmlFor="spend-amount">{form.data?.currency ? `Amount (${form.data.currency})` : 'Amount'}</FieldLabel>
              <TextField id="spend-amount" type="number" min={0} step="any" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="gwui-suite-q">
              <FieldLabel htmlFor="spend-what">What it is for</FieldLabel>
              <TextField id="spend-what" value={what} maxLength={300} onChange={e => setWhat(e.target.value)} />
            </div>
            {form.data?.categories && form.data.categories.length > 0 && (
              <div className="gwui-suite-q">
                <FieldLabel htmlFor="spend-category">{categoryLabel}</FieldLabel>
                <Select id="spend-category" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Not sure</option>
                  {form.data.categories.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            )}
            <div><Button type="submit" disabled={!canSend}>Send</Button></div>
            {problem && <Note tone="error">{problem}</Note>}
          </form>
        )}
      </Panel>
    </Page>
  )
}
