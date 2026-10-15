import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/*
 * "A FIXED CORNER IS A BET THAT NO SCREEN WILL EVER NEED THAT CORNER." AppShell's own comment,
 * written after this button had been moved three times.
 *
 * It was moved a fourth time for the same reason. On a chat page the trigger is positioned from
 * the top, and a narrow screen put it in the header row on top of a control there - so the fix
 * sent it to `bottom: 76px`, which is the bottom nav's 60px strip plus a gap.
 *
 * Measured in a browser at 375x812 on 15 September 2026: the composer row occupies 691 to 752, and
 * the trigger sat at 704 to 736. `document.elementFromPoint` at the centre of the Send button
 * returned the feedback trigger. On a phone, pressing Send opened the feedback form.
 */
describe('the feedback button never covers a control', () => {
  const css = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8')
  const chatRule = css.slice(css.indexOf('.gw-fb-trigger-chat-mobile-safe'), css.indexOf('.gw-fb-trigger-chat-mobile-safe') + 2200)

  it('clears the composer on a narrow chat page, not just the nav bar', () => {
    /* 60 for the nav, 60 for the composer row, and a gap. 76 was the nav alone. */
    expect(chatRule).toMatch(/bottom:\s*148px\s*!important/)
    expect(chatRule).not.toMatch(/bottom:\s*76px\s*!important/)
  })

  it('and says what it measured, so the next person moving it knows what it lands on', () => {
    expect(chatRule).toMatch(/691 to 752/)
    expect(chatRule).toMatch(/could not send a message by pressing Send/)
  })

  it('the composer keeps its own stacking context, so a float can never take its click', () => {
    /* Was an inline `style={{ position: 'relative', zIndex: 101 }}` (group 3, piece 4d-1 moved it
       into a named class, gwui-ec-composer-inner, in gw-ui.css - same two properties, same values). */
    const entry = readFileSync(join(__dirname, '..', '..', 'pages', 'enter', 'EntryChatPage.tsx'), 'utf8')
    expect(entry).toContain('className="gwui-ec-composer-inner"')
    const css = readFileSync(join(__dirname, 'ui', 'gw-ui.css'), 'utf8')
    expect(css).toMatch(/\.gwui-ec-composer-inner\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*101/)
  })

  it('and the float it has to beat is the one below it', () => {
    const shell = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')
    expect(shell).toMatch(/zIndex: 100/)
  })
})
