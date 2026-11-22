import type { YourBoard } from '@/api/you'
import { YourToDos } from './YourToDos'
import { YourCommitments } from './YourCommitments'
import { YourPatternsAndCoaching } from './YourPatternsAndCoaching'
import { YourPerformanceHistory } from './YourPerformanceHistory'
import { YourLeave } from './YourLeave'
import { YourRequests } from './YourRequests'

/**
 * WHAT IS YOURS, SECTION BY SECTION (Hafsah, 21 November 2026: "You does not have your to-do list, commitments or patterns/coaching,
 * performance history, leave etc."). Each section is always drawn, with a plain sentence when it is empty, so the page says what it
 * holds instead of leaving gaps. Each is its own file and reads its facts from where they already live; none keeps a copy.
 * YouPage.tsx draws this in one line.
 */
export function EverythingThatIsYours({ b }: { b: YourBoard }) {
  return (
    <>
      <YourToDos b={b} />
      <YourCommitments b={b} />
      <YourPatternsAndCoaching b={b} />
      <YourPerformanceHistory b={b} />
      <YourLeave />
      <YourRequests />
    </>
  )
}
