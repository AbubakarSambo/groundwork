import { useContext } from 'react'
import { QueryClient, QueryClientContext, useQuery } from '@tanstack/react-query'
import { billingApi } from '@/api/billing'
import { Note } from '@/components/gw/ui'

/**
 * "THIS ADDS A SEAT: +$5 A MONTH" (fix list item 6, Hafsah's own words). Every place somebody is invited reads the server's
 * answer before it sends (GET /billing/next-seat), so the person inviting sees the price whenever the next person goes past
 * the seats the plan includes. Nothing is said when the invitation adds nothing to the bill, or when it cannot be read.
 */
/* A part drawn outside the app's query provider (a test of the part alone) asks nothing and says nothing. */
const NO_PROVIDER = new QueryClient()

export function useTheNextSeat() {
  const client = useContext(QueryClientContext)
  return useQuery({ queryKey: ['next-seat'], queryFn: billingApi.nextSeat, retry: false, staleTime: 30_000, enabled: !!client }, client ?? NO_PROVIDER)
}

/**
 * THE COST LINE WHERE SOMEBODY IS ADDED (Hafsah, 21 November 2026): the server's one line (`line`, from what-a-month-costs.ts
 * whatAddingSomebodySays, the prices Plan and billing reads), and the WhatsApp line where it applies. "This is your 16th of 20
 * seats, so your bill doesn't change." or "This needs a new seat. It adds $5 a month from today." or "Nothing is charged during
 * your free trial." A server that sends no line yet falls back to the old sentence, only when it adds a seat.
 */
export function ThisAddsASeat() {
  const next = useTheNextSeat()
  const d = next.data
  if (!d) return null
  const line = d.line ?? (d.addsASeat ? d.says : null)
  if (!line && !d.whatsappLine) return null
  return (
    <Note tone={d.needsAYes || d.addsASeat ? 'amber' : undefined}>
      {[line, d.whatsappLine].filter(Boolean).join(' ')}
    </Note>
  )
}
