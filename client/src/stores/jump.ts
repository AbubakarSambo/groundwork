import { create } from 'zustand'

/** Whether "Jump to" is open. Opened from the sidebar, from "More" on a phone, or with Ctrl K. */
interface JumpStore {
  open: boolean
  show: () => void
  hide: () => void
  toggle: () => void
}

export const useJumpStore = create<JumpStore>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
