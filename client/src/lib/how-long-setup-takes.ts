import { useQuery } from '@tanstack/react-query'
import { entryApi } from '@/api/entry'

/**
 * HOW LONG SETUP TAKES, MEASURED (Hafsah's approval of the target journey, 1 November 2026, change 3: "Setup's opening states an
 * honest length. Time setup in the next run and use the real figure, instead of 'about two minutes'").
 *
 * The one owner of the figure: the way in and setup's opening line both read it, so they never disagree.
 *
 * Measured on 3 November 2026 from the local test database gw_loop_round16, read only: entry_drafts, from the row's created_at (the
 * lead's setup first kept) to consumed_at (the setup saved), for the ten setups of the latest round (8 and 9 February 2027 on the
 * test clock). Median 4.4 minutes, middle half 2.8 to 6.4 minutes; across all 58 saved setups in that database, median 3.5 minutes.
 * Said as "about five minutes", rounded up rather than down. Re-measure after each run and change the number here.
 */
export const SETUP_TAKES_MINUTES = 5

/** "about five minutes" */
export const SETUP_TAKES = `about ${['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][SETUP_TAKES_MINUTES] ?? SETUP_TAKES_MINUTES} minutes`

/**
 * HOW LONG A TEAM MEMBER'S CHECK-IN TAKES, as the server serves it from its one owner (A_CHECK_IN_TAKES in
 * api/src/modules/participants/when-it-asks.ts, the measured figure). The client holds no copy: "About two minutes", or null until
 * it is served, when the pages say nothing about the length rather than a figure of their own.
 */
export function useACheckInTakes(): string | null {
  const { data } = useQuery({
    queryKey: ['a-check-in-takes'],
    queryFn: () => entryApi.aCheckInTakes(),
    staleTime: Infinity,
    retry: false,
  })
  return data ?? null
}

/** The same, inside a sentence: "about two minutes". */
export const inASentence = (takes: string) => takes.charAt(0).toLowerCase() + takes.slice(1)
