import { create } from 'zustand'

/**
 * SCREEN FAULT 11: THE QUEUE READ WENT OUT ON EVERY PAGE, EVEN WITH BOTH SUITES OFF.
 *
 * `GET /suites/queue` (queueApi.get, read by AppShell's sidebar and by QueueLink on Today and
 * Suites) answers 404 for an organisation with neither suite switched on - quiet now (no pop-up,
 * `skipNotFoundToast`), but still a real request, repeated as the cached result goes stale
 * (`staleTime: 30_000`) however many pages this reader visits. Whether a suite is on is not served
 * anywhere cheap to a member (`/suites` itself refuses one - only an admin or a lead may open it),
 * so there is no served flag this store can read instead of asking. What IS cheap is remembering
 * the answer once this session has already asked and been told no: the first 404 sets this true,
 * and every query that checks it before firing stops asking again until the page is reloaded.
 */
interface SuitesKnownOffStore {
  off: boolean
  setOff: () => void
}

export const useSuitesKnownOffStore = create<SuitesKnownOffStore>((set) => ({
  off: false,
  setOff: () => set({ off: true }),
}))
