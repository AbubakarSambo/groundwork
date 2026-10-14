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

export function ThisAddsASeat() {
  const next = useTheNextSeat()
  if (!next.data?.addsASeat || !next.data.says) return null
  return <Note tone="amber">{next.data.says}</Note>
}
