import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * FOUR PLACES TOLD SOMEBODY THEIR WORK WAS SAFE WHILE LOSING IT.
 *
 * "Your message is still here" after the composer was cleared and the turn reverted out of the
 * history — it was in neither. "What you wrote is still here" over an emptied textarea. A chat
 * bubble left on screen that a reload deleted. And a Google button that carried the conversation
 * in localStorage, caught the refusal, and navigated away anyway.
 *
 * A message that says the words are safe is worse than no message: somebody who is told that does
 * not retype them. So the rule is one line — if the words are gone from the box, put them back
 * before saying anything.
 */
const here = dirname(fileURLToPath(import.meta.url))
const read = (p: string) => readFileSync(join(here, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const ENTRY = read('EntryChatPage.tsx')
const CHAT = read('../chat/ChatPage.tsx')

describe('a failed send puts the words back', () => {
  /*
   * B-220: THE WINDOW GREW. The catch now also decides which sentence to show (the server's own,
   * a timeout, or the plain fallback - `onboardingSendError`) before the first one reading "back in
   * the box" is reached, where it used to be the very next thing after `setInput`.
   */
  it('the onboarding turn goes back in the composer', () => {
    const at = ENTRY.indexOf('setOnboardingHistory(onboardingHistory)')
    const around = ENTRY.slice(at, at + 600)
    expect(around).toContain('setInput(')
    expect(around).toMatch(/back in the box/)
  })

  /* Changed 22 November 2026: the report's correction box went with the save card (the report is not part of setup), so there is no
     textarea left there to lose words from. */
  it('the correction box that could lose words is gone from setup', () => {
    expect(ENTRY).not.toContain('setCorrectionText(')
  })

  it('the chat message goes back, and its bubble comes off the screen', () => {
    /* Left there it looks sent, and a reload deletes it — the worst order for finding out. */
    const at = CHAT.indexOf("setMsgs(v => v.filter(m => m.id !== localId))")
    expect(at).toBeGreaterThan(-1)
    /* Widened 3 November 2026: the sentence now sits inside whatTheServerSaid(...), so it starts past the old 220 characters. */
    const around = CHAT.slice(at, at + 320)
    expect(around).toContain('setInput(message)')
    expect(around).toMatch(/back in the box/)
  })
})

describe('nothing claims the work is safe when it is not', () => {
  it('and where a message DOES say the words are still here, they are', () => {
    /*
     * The rule is not "never say it" — the document assessment editor says exactly that and is
     * telling the truth, because it never clears its textareas and only leaves edit mode on
     * success. Banning the sentence would have made an honest message worse.
     */
    const at = CHAT.indexOf('The correction did not save')
    expect(at).toBeGreaterThan(-1)
    const fn = CHAT.slice(CHAT.lastIndexOf('async function save()', at), at)
    expect(fn).not.toMatch(/set(SuggestsText|WillDoText)\(''\)/)
    expect(fn).not.toMatch(/setEditing\(false\)[\s\S]*?await/)
  })

  /* Changed 22 November 2026: setup has no Google hand-off of its own now (start-chat.txt: an email and Save it), so nothing can walk
     away with the conversation from here. */
  it('and setup has no hand-off that leaves the page with the conversation', () => {
    expect(ENTRY).not.toContain('function continueWithGoogle')
    expect(ENTRY).not.toContain('window.location.href')
  })
})
