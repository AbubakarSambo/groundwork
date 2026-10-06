import { useQuery } from '@tanstack/react-query'
import { entryAnchorApi } from '@/api/entry'

/*
 * WHETHER THE ANCHOR SCENARIO IS ON, AS A STRANGER CAN READ IT (plan piece 1; request 144 (1)).
 *
 * `release.anchorScenario` is real on the engine (`theAnchorScenarioIsOn`,
 * api/src/modules/admin/what-is-hidden-at-release.ts) and is already served as `anchorScenarioOn`
 * on the board (api/src/modules/board/board.service.ts line 777) - but only to someone already
 * signed in and already running a check-in (the same reach as `kindsOffered`). A stranger who has
 * just followed a shared link has no session and reads no board, so there was nothing public yet to
 * read the setting from.
 *
 * The engine now serves `GET /entry/anchor-available`, open to anybody, answering only
 * `{ available }` and nothing else (docs/answers-from-engine.md, "Request 144 (1)"). This hook asks
 * it. While the answer is still loading, or the call fails, it reads as `false` - the same safe
 * default as before the engine served anything, so a visitor never sees a half-drawn landing page
 * and nothing is shown for it that has not been confirmed. The server itself caches the answer for
 * 30 seconds, so a busy landing page costs one read; `staleTime` here just avoids asking twice for
 * one visit.
 */
/**
 * `undefined` while the answer has not arrived yet - the caller treats that the same as `false`
 * (nothing is shown until the engine has actually said so), but keeps it distinct so it does not
 * redirect away from itself before asking `anchor-start` for the scenario (item 2).
 */
export function useAnchorScenarioIsOnForAStranger(): boolean | undefined {
  const { data, isLoading } = useQuery({
    queryKey: ['anchor-available'],
    queryFn: () => entryAnchorApi.available(),
    staleTime: 30_000,
    retry: false,
  })
  if (isLoading) return undefined
  return data?.available === true
}
