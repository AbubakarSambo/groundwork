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
  /**
   * B-210: THE ASK PAGE ITSELF (`/chat`, AskPage.tsx) IS ALREADY THE PANEL - IT MUST NOT ALSO OPEN
   * THE DESKTOP DRAWER. `showWith` sets `open: true`, which is right for a button on some OTHER
   * page (the board's own Ask bar, Context's "Add context with Ask"), but AskPage called it too,
   * so on a computer the drawer rendered beside the page it already was, and BOTH copies of
   * AskGroundwork read the same `pendingMessage` and sent it, doubling every `POST /ask`. On a
   * phone the drawer is only hidden by CSS (`.gw-ask-drawer { display: none }`), so it still
   * mounted and still sent. `queueMessage` carries the question to whichever single AskGroundwork
   * is actually on screen without touching `open`.
   */
  queueMessage: (message: string) => void
  consumePendingMessage: () => void
  /**
   * DECISION 65: ASK OPENED FROM A CHECK-IN'S OWN CONTEXT AND RESOURCES PAGE KNOWS WHICH ONE.
   *
   * Set only by that page's own "Add context with Ask ..." button (never by an ordinary question),
   * so the panel's first message is the empty "start" the setup conversation reads, carrying this
   * check-in's id and `openedFrom: "check_in_setup"` (docs/answers-from-engine.md, 30 September,
   * "decision 65"). Cleared when the panel closes, so reopening it later for an ordinary question
   * never carries it by accident.
   */
  openedFromCheckInSetupGroundId: string | null
  showForCheckInSetup: (groundId: string) => void
  consumeOpenedFromCheckInSetup: () => void
}

export const useAskStore = create<AskStore>((set) => ({
  open: false,
  toggle: () => set((s) => (s.open ? { open: false, openedFromCheckInSetupGroundId: null } : { open: true })),
  show: () => set({ open: true }),
  hide: () => set({ open: false, openedFromCheckInSetupGroundId: null }),
  pendingMessage: null,
  showWith: (message: string) => set({ open: true, pendingMessage: message }),
  queueMessage: (message: string) => set({ pendingMessage: message }),
  consumePendingMessage: () => set({ pendingMessage: null }),
  openedFromCheckInSetupGroundId: null,
  showForCheckInSetup: (groundId: string) => set({ open: true, pendingMessage: '', openedFromCheckInSetupGroundId: groundId }),
  consumeOpenedFromCheckInSetup: () => set({ openedFromCheckInSetupGroundId: null }),
}))
