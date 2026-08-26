import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * A CONTROL THAT REFUSES SAYS WHY IT REFUSED.
 *
 * The Context page carries three write boxes, and all three buttons grey out on an empty field while
 * saying nothing. Somebody who clicked into the wrong box, or typed only spaces, met a button that
 * would not work and gave no reason - which reads as broken rather than as waiting.
 *
 * The reasons differ in the one way that matters on this page: who ends up reading the thing. So each
 * says what happens after, not just "type something".
 *
 * This is the same rule the refusals on the server follow - a refusal that does not tell you what to
 * do next is the failure, not the fix.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** The write boxes moved out of the page and into the one Context page. */
const CODE = readFileSync(path.join(__dirname, '../../components/gw/ContextPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('a dead button says why', () => {
  it('the check-in note button', () => {
    expect(CODE).toContain('Write something first, then this adds it.')
  })

  /** The two that differ by audience say which audience. */
  it('the shared note button says everyone will read it', () => {
    expect(CODE).toContain('Write something first, then everyone here can read it.')
  })

  it('the private steer says only you will', () => {
    expect(CODE).toContain('Write something first, then only you will see it.')
  })

  /**
   * The reason is attached to the disabled STATE, not printed always - a permanent instruction under
   * a working button is noise, and it is the refusal that needs explaining.
   */
  it('and each reason appears only while the button is refusing', () => {
    for (const flag of ['ctxNote', 'sharedNoteText', 'leadCtxText']) {
      expect(CODE).toContain("title={!" + flag + ".trim() ? 'Write something first")
    }
  })
})
