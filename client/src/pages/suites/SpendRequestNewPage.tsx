import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { fileARequestApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whatFilingARequestSays } from '@/lib/file-a-request-error'
import { Page, PageTitle, Panel, FieldLabel, TextField, Button, Note } from '@/components/gw/ui'

/**
 * CREATE A PAYMENT REQUEST, FROM ITS OWN FORM (request 165, Hafsah 6 October;
 * docs/requests-to-engine.md).
 *
 * Reached from the check-in's own "Create request" button (anchor pieces 26/27,
 * `RequestOffer.tsx`'s `OpenTheRequest`), which carries what was read from the person's own words
 * in router state as `prefill: { amount?, what?, currency? }`. With no prefill, every field starts
 * empty.
 *
 * `POST /suites/spend/requests` does not exist on the server yet (request 165), so sending this
 * today gets a 404, which is said plainly rather than as a raw server error - see
 * `whatFilingARequestSays`. On success, the person goes to "Your requests" (`/suite/mine`), told
 * it was sent in the server's own sentence where it sends one.
 */
export function SpendRequestNewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const prefill = (location.state as { prefill?: { amount?: number; what?: string; currency?: string } | null } | null)?.prefill

  const [amount, setAmount] = useState(prefill?.amount != null ? String(prefill.amount) : '')
  const [what, setWhat] = useState(prefill?.what ?? '')
  const [problem, setProblem] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: () => fileARequestApi.spending({ amount: Number(amount), what: what.trim() }),
    onSuccess: (res) => navigate('/suite/mine', { state: { sentMessage: res?.message ?? 'Your payment request has been sent.' } }),
    onError: (e: unknown) => setProblem(whatFilingARequestSays(e, user?.organizationName)),
  })

  const parsedAmount = Number(amount)
  const canSend = amount.trim() !== '' && !Number.isNaN(parsedAmount) && parsedAmount > 0 && what.trim() !== '' && !send.isPending

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Your requests', to: '/suite/mine' }, { label: 'Create a payment request' }]}
        title="Create a payment request"
        subtitle="Say how much, and what it is for, and Groundwork will send it to the right person."
      />
      <Panel>
        <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (canSend) send.mutate() }}>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="spend-amount">Amount</FieldLabel>
            <TextField id="spend-amount" type="number" min={0} step="any" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="spend-what">What it is for</FieldLabel>
            <TextField id="spend-what" value={what} maxLength={300} onChange={e => setWhat(e.target.value)} />
          </div>
          <div><Button type="submit" disabled={!canSend}>Send</Button></div>
          {problem && <Note tone="error">{problem}</Note>}
        </form>
      </Panel>
    </Page>
  )
}
