import { create } from 'zustand'

/** Whether the Ask Groundwork panel is open beside the page (D1). On a phone it is its own page. */
interface AskStore {
  open: boolean
  toggle: () => void
  hide: () => void
}

export const useAskStore = create<AskStore>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  hide: () => set({ open: false }),
}))
