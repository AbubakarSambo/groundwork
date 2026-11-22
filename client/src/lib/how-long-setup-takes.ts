import { useQuery } from '@tanstack/react-query'
import { entryApi } from '@/api/entry'

/*
 * SETUP'S OWN FIGURE IS GONE (Hafsah, 22 November 2026: the chat said "about five minutes" and the setup page "about ten"). Setup is the
 * lead's first check-in, so every page says the one figure the server serves, below.
 */

/**
 * HOW LONG A TEAM MEMBER'S CHECK-IN TAKES, as the server serves it from its one owner (A_CHECK_IN_TAKES in
 * api/src/common/how-long-a-check-in-takes.ts, Hafsah's fixed decision). The client holds no copy: "About ten minutes", or null until
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

/** The same, inside a sentence: "about ten minutes". */
export const inASentence = (takes: string) => takes.charAt(0).toLowerCase() + takes.slice(1)
