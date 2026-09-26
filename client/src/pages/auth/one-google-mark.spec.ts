import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * ONE GOOGLE LOGO PER BUTTON.
 *
 * The sign-up button carried two, stacked. Added when the mark went in and never seen, because that
 * change was checked on the sign-in half of the same page - the two buttons are near-identical and
 * only one of them was looked at.
 *
 * U.2: the buttons are built once, by `googleButton(label)`, and read "Sign in with Google" and
 * "Sign up with Google" as the prototype does. So the check is on that one builder, and on both
 * labels reaching it.
 */
const PAGE = readFileSync(join(__dirname, 'AuthPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('every Google button', () => {
  it('carries exactly one mark', () => {
    const builder = PAGE.slice(PAGE.indexOf('const googleButton'), PAGE.indexOf(') : null', PAGE.indexOf('const googleButton')))
    expect(builder.match(/<GoogleMark \/>/g) ?? []).toHaveLength(1)
    expect(PAGE.match(/<GoogleMark \/>/g) ?? []).toHaveLength(1)
  })

  it('and both buttons are made by it, with the prototype\'s words', () => {
    expect(PAGE).toContain("googleButton('Sign in with Google')")
    expect(PAGE).toContain("googleButton('Sign up with Google')")
    expect(PAGE).not.toContain('Continue with Google')
  })
})
