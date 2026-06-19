import { create } from 'zustand'

interface EntryStore {
  groundName: string
  sessions: number
  setGroundName: (name: string) => void
  setSessions: (n: number) => void
}

export const useEntryStore = create<EntryStore>()((set) => ({
  groundName: 'Entry session',
  sessions: 1,
  setGroundName: (name) => set({ groundName: name }),
  setSessions: (n) => set({ sessions: n }),
}))
