import { QueryClient } from '@tanstack/react-query'

/**
 * The app's one query client, shared.
 *
 * It used to be created inline in App.tsx, which meant code outside the React
 * tree could not invalidate anything. That mattered in a real case: the
 * magic-link verification creates the org's first ground from a plain async
 * function, and had no way to tell the sidebar's cached grounds list that it now
 * had something to show. The list is cached for 30 seconds and is fetched when
 * the shell mounts - before the ground exists - so a person who had just created
 * their first ground was told "No grounds yet" while looking at it. GW-019.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})
