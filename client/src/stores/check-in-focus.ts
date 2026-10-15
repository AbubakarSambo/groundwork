import { create } from 'zustand'

/**
 * WHETHER THE CONVERSATION AT /checkin/:id IS STILL "IN FOCUS" - A LIVE SESSION WITH ITS OWN WAY
 * OUT (Pause), THE ONE CASE THE PHONE'S BOTTOM BAR IS DELIBERATELY HIDDEN FOR (REVIEW ROUND 3,
 * ITEM 7). AppShell cannot tell a live session from its own done state just by the URL - both are
 * the same route, `/checkin/:id` (ChatPage.tsx), with the conversation replaced by the Done page
 * once the person finishes. The URL rule (`onConversationPage`) used to hide the bar for the whole
 * route regardless, which left the Done page - and `/checkin/:id/report` beside it, which was
 * never the conversation at all - with no bottom bar and no way back to Today (screen fault 2).
 *
 * ChatPage sets this true while a live session is in front of the person (something to leave with
 * Pause), and false once it has settled into its own done, completed or declined state, where the
 * bottom bar's own "Today" is the way back out. Starts true, so a fresh visit to a live session
 * still hides the bar on its very first render, before ChatPage's own effect has had a chance to
 * read the session's state.
 */
interface CheckInFocusStore {
  focused: boolean
  setFocused: (focused: boolean) => void
}

export const useCheckInFocusStore = create<CheckInFocusStore>((set) => ({
  focused: true,
  setFocused: (focused) => set({ focused }),
}))
