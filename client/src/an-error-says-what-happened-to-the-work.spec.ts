import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

/**
 * "COULD NOT SAVE THAT." IS THE WRONG SENTENCE IN A PRODUCT ABOUT KEEPING A RECORD.
 *
 * Three of eighty-six error messages said whether anything had been lost. The rest named the failure
 * and stopped, which leaves the reader to guess at the only thing they actually want to know: is what
 * I just wrote gone?
 *
 * There are two honest answers and the message has to pick one. Where somebody typed something, it is
 * still in the box. Where they did not, nothing changed - nobody was emailed, no plan was billed, no
 * report went out. Both answer the question; neither is a reassurance in general terms.
 *
 * This asserts the RULE rather than the sentences, because eighty-six strings will keep being added
 * to and the next one should carry the clause without anybody remembering this file.
 */
const SRC = join(__dirname)
const files: string[] = []
const walk = (d: string) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(tsx?)$/.test(e) && !e.includes('.spec.')) files.push(p)
  }
}
walk(SRC)

const toasts = (): { msg: string; file: string }[] => {
  const out: { msg: string; file: string }[] = []
  for (const f of files) {
    const s = readFileSync(f, 'utf8')
    for (const m of s.matchAll(/toast\.error\(\s*'((?:[^'\\]|\\.){6,180})'/g)) {
      out.push({ msg: m[1], file: f.split('/').pop()! })
    }
  }
  return out
}

/** A message about a change the product tried and failed to make. */
const MUTATION = /\b(save|saved|send|sent|update|updated|add|added|remove|release|change|upload|invite|publish|approve|decline|create|begin|activate|discard)\b/i
/**
 * Either honest answer to "did I lose anything".
 *
 * Two forms count, and the second was missed on the first pass. An explicit safety clause - "still
 * here", "nobody has been emailed" - is one. But so is stating the outcome in the negative: "The
 * name did not change" already tells the reader the prior state is intact, and padding it with a
 * reassurance would be words for their own sake. What fails this is naming the ATTEMPT and stopping
 * - "Could not save that." - which leaves the outcome for the reader to guess.
 */
const ANSWERS = new RegExp([
  'still here', 'still in the box', 'still saved', 'still works', 'still visible',
  'nothing has changed', 'nothing was added', 'nothing else was altered',
  'nobody has been emailed', 'nobody has been sent', 'not been charged',
  'is unchanged', 'are saved', 'unaffected', 'on the record',
  'did not (change|save|send|upload|publish|activate|go through)',
  /* "That didn't save. Try again." says what went wrong and what to do (Hafsah, 25 October: errors say what went wrong and what to do). */
  'didn’t (save|send|load|work)\\. Try again',
  '(was|were) not (released|added|removed|approved|declined|discarded|activated)',
].join('|'), 'i')

describe('an error says what happened to the work', () => {
  it('finds the messages, so an empty sweep cannot pass', () => {
    expect(toasts().length).toBeGreaterThan(60)
  })

  it('every failed change says what became of the work', () => {
    const silent = toasts()
      .filter(t => MUTATION.test(t.msg) && !ANSWERS.test(t.msg))
      .map(t => `${t.file}: ${t.msg}`)
    expect(silent).toEqual([])
  })

  it('and none of them is the system talking', () => {
    /* "Failed to X" is a log line. "Could not X" is a sentence said to a person. */
    const systemVoice = toasts().filter(t => /^Failed to /.test(t.msg)).map(t => t.msg)
    expect(systemVoice).toEqual([])
  })
})
