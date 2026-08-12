import { create } from 'zustand'

/**
 * CHAT OR MORE, FOR THE WHOLE APP.
 *
 * Hafsah: "at the top you can switch between checkins and summaries... and
 * everything on the left menu is now chat like channels."
 *
 * I built this first as a control inside the ground's Check-in tab, which is
 * wrong twice: it is not at the top, and it only changed one panel of one page
 * while the rail stayed a dashboard. The switch is a mode the whole app is in, so
 * it lives at the top of the rail and everything reads it from here.
 *
 * Remembered, because somebody who prefers one should not re-choose it on every
 * ground they open.
 */

export type AppView = 'chat' | 'more'

const KEY = 'gw:appView'

function remembered(): AppView {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'more' ? 'more' : 'chat'
  } catch {
    // Private browsing. Chat is the default anyway.
    return 'chat'
  }
}

interface ViewStore {
  view: AppView
  setView: (v: AppView) => void
}

export const useViewStore = create<ViewStore>((set) => ({
  view: remembered(),
  setView: (view) => {
    try { localStorage.setItem(KEY, view) } catch { /* nothing to do */ }
    set({ view })
  },
}))
