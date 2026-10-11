import { create } from 'zustand'

/**
 * B-218: THE FEEDBACK BUTTON SAT ON "0 OF N SET".
 *
 * `FillsInAsYouTalk`'s own side panel (EntryChatPage.tsx, U.6) is a full-height column down the
 * right edge of the page once a situation has been picked - there is no position left of it that
 * is still "the top-right corner" and also clear of it. AppShell cannot tell this from the route
 * alone (`/start` is the same address before and after a situation is picked, and the panel's own
 * state lives inside EntryChatPage, not the URL), so EntryChatPage tells the shell directly, the
 * same way `useCheckInFocusStore` already does for the live conversation.
 */
interface EntryFillsInPanelStore {
  showing: boolean
  setShowing: (showing: boolean) => void
}

export const useEntryFillsInPanelStore = create<EntryFillsInPanelStore>((set) => ({
  showing: false,
  setShowing: (showing) => set({ showing }),
}))
