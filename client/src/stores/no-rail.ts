import { create } from 'zustand'

/**
 * A PAGE THAT ASKS FOR NO RAIL, WHEREVER IT IS.
 *
 * The shell hides its sidebar by address (CHROMELESS in AppShell). The not-found page has no
 * address of its own: it is whatever path matched nothing. The prototype draws it as a card of its
 * own, with no sidebar (F4-small-states/nowhere.jpg), so the page says so here while it is shown.
 */
interface NoRailStore {
  asked: boolean
  set: (asked: boolean) => void
}

export const useNoRailStore = create<NoRailStore>((set) => ({
  asked: false,
  set: (asked) => set({ asked }),
}))
