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
  /**
   * RESTORED (8 October, nothing-removed audit S2): "off" PER SUITE, NOT ACROSS ALL THREE.
   *
   * `off`/`setOff` above answer one question only - the queue read, which is a single request - so
   * they stay as they were for AppShell and QueuePage. Today's "Your own leave and spending
   * requests" link asks three separate questions (leave, spending, hours), and B-002's fix
   * (`f0c84389`) wired all three to that single flag: one 404, from a suite that really is off,
   * marked every suite off for the rest of the session, so an organisation with leave on and time
   * sheets off lost the link once the cached "leave is on" answer went stale - a suite that was
   * never asked about again read as off along with the one that genuinely was. `offByKey` answers
   * per suite instead, so a suite that has not yet 404'd keeps asking normally, and only the ones
   * that have already said no stop repeating a call that cannot succeed.
   */
  offByKey: Record<string, boolean>
  setKeyOff: (key: string) => void
}

export const useSuitesKnownOffStore = create<SuitesKnownOffStore>((set) => ({
  off: false,
  setOff: () => set({ off: true }),
  offByKey: {},
  setKeyOff: (key) => set((s) => ({ offByKey: { ...s.offByKey, [key]: true } })),
}))
