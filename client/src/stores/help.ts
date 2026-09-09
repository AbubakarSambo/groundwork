import { create } from 'zustand'

interface HelpStore {
  open: boolean
  tab: 0 | 1 | 2 | 3 | 4
  show: (tab?: 0 | 1 | 2 | 3 | 4) => void
  hide: () => void
  setTab: (tab: 0 | 1 | 2 | 3 | 4) => void
}

export const useHelpStore = create<HelpStore>((set) => ({
  open: false,
  tab: 0,
  show: (tab = 0) => set({ open: true, tab }),
  hide: () => set({ open: false }),
  setTab: (tab) => set({ tab }),
}))
