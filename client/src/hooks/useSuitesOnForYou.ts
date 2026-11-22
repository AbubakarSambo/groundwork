import { useQuery } from '@tanstack/react-query'
import { suitesApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'

/**
 * WHICH OF YOUR OWN SUITES ARE ON, READ ONCE (journey walk row 5).
 *
 * Every page asked `/suites/leave/mine`, `/suites/spend/mine`, `/suites/time/mine` and
 * `/suites/reviews/mine` for everybody, and each one answers 404 while its suite is off (B-198, a
 * refusal by design). About 44 screens logged those 404s. `GET /suites/mine` says which are on in
 * one call that never refuses, so a page asks a suite's own route only when that suite is on.
 * Until the answer is in, nothing is asked. Shared by query key, so every page pays for it once.
 */
export function useSuitesOnForYou() {
  const user = useAuthStore(s => s.user)
  const q = useQuery({
    queryKey: ['suites-on-for-you', user?.organizationId ?? null],
    queryFn: suitesApi.mine,
    enabled: !!user,
    retry: false,
    staleTime: 5 * 60_000,
  })
  const on = q.isSuccess ? q.data : undefined
  /* Whether the Suites page and the leave board will open for this reader, by their own rules on the server, so neither page asks to be refused. */
  return { leave: !!on?.leave, spending: !!on?.spend, hours: !!on?.time, reviews: !!on?.reviews, maySeeSuites: !!on?.maySeeSuites, mayOpenTheLeaveBoard: !!on?.mayOpenTheLeaveBoard, known: q.isSuccess }
}
