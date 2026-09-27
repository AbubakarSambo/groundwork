import { create } from 'zustand'

/** Whether the Ask Groundwork panel is open beside the page (D1). On a phone it is its own page. */
interface AskStore {
  open: boolean
  toggle: () => void
  /** Opens it, from a button that asks about something (the Company page's "Ask about the whole organisation"). */
  show: () => void
  hide: () => void
}

export const useAskStore = create<AskStore>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}))
