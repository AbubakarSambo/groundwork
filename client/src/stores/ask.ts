import { create } from 'zustand'

/** Whether the Ask Groundwork panel is open beside the page (D1). On a phone it is its own page. */
interface AskStore {
  open: boolean
  toggle: () => void
  /** Opens it, from a button that asks about something (the Company page's "Ask about a check-in"). */
  show: () => void
  hide: () => void
  /**
   * U.10 item 8: THE BOARD'S OWN ASK BAR ("Ask about this board, for example…"). A question typed
   * there opens the panel AND asks it, in one step - the prototype's bar is not a second place to
   * type before the real one. `pendingMessage` is read once by AppShell's AskGroundwork mount and
   * handed to it as `initialMessage`; `consumePendingMessage` clears it so it is never re-sent.
   */
  pendingMessage: string | null
  showWith: (message: string) => void
  consumePendingMessage: () => void
}

export const useAskStore = create<AskStore>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
  pendingMessage: null,
  showWith: (message: string) => set({ open: true, pendingMessage: message }),
  consumePendingMessage: () => set({ pendingMessage: null }),
}))
