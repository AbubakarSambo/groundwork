import { create } from 'zustand'

interface FeedbackStore {
  open: boolean
  show: () => void
  hide: () => void
}

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}))
