import { create } from 'zustand'

/** Whether the short tour is running, and at which step. */
interface TourStore {
  step: number | null
  start: () => void
  go: (step: number) => void
  stop: () => void
}

export const useTourStore = create<TourStore>((set) => ({
  step: null,
  start: () => set({ step: 0 }),
  go: (step) => set({ step }),
  stop: () => set({ step: null }),
}))
