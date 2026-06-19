import { create } from 'zustand'

interface HelpStore {
  open: boolean
  tab: 0 | 1 | 2 | 3
  show: (tab?: 0 | 1 | 2 | 3) => void
  hide: () => void
  setTab: (tab: 0 | 1 | 2 | 3) => void
}

export const useHelpStore = create<HelpStore>((set) => ({
  open: false,
  tab: 0,
  show: (tab = 0) => set({ open: true, tab }),
  hide: () => set({ open: false }),
  setTab: (tab) => set({ tab }),
}))
