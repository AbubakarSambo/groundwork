import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * THE PRODUCT TALKED ABOUT THE LEAD IN FRONT OF THE LEAD.
 *
 * Hafsah, on her own check-in: "why would you say it comes from the leads own check or context chat
 * when i am actually the lead." Saved as item D on the Context fix list.
 *
 * Three lines did it, and two of them disagreed with each other about the same fact within one
 * scroll: the person card said "the lead's words, not theirs" and the commitments band two bands
 * below said "your words, not theirs".
 */
const CONTEXT = readFileSync(join(__dirname, 'ContextPage.tsx'), 'utf8')
const CARDS = readFileSync(join(__dirname, 'EachPerson.tsx'), 'utf8')

describe('what the page calls whoever is reading it', () => {
  it('the brief says "yours" to the person who wrote it', () => {
    /* Since U.7 in the prototype's sentence, under the brief: "Your words, from setup." To anyone
       else it names the lead, never "the lead". */
    /* U.7 review: said only while the text is her unchanged words (whoseWords in ContextPage). */
    expect(CONTEXT).toContain("if (isTheLead) return changedBy ? 'Your words.' : 'Your words, from setup.'")
    expect(CONTEXT).toContain("`${theLeadsFirstName}\\u2019s words, from setup.`")
  })

  it('and the rules are the ones you wrote', () => {
    /* U.7 review: a full sentence now, and the lead's name to anyone else. */
    expect(CONTEXT).toContain("isTheLead ? 'These are the rules, as you wrote them.' : `These are the rules, as ${theLeadMidSentence} wrote them.`")
  })

  it('and a line you put in somebody else’s mouth is your line', () => {
    /* U.7 review: to the lead alone (an admin reading the page did not write it), in a sentence. */
    expect(CARDS).toContain("isTheLead ? 'These are your words, not theirs.'")
  })

  /*
   * AND NO USER-FACING LINE NAMES THE LEAD WITHOUT ASKING WHO IS READING.
   *
   * Every remaining "the lead" in copy on these two files sits on the far side of an isLead or
   * isTheLead branch. A new one that does not fails here, which is the only way this stops coming
   * back - it has now been fixed twice.
   */
  it('and every mention of the lead is on one side of a branch', () => {
    const offenders: string[] = []
    for (const src of [CONTEXT, CARDS]) {
      const prose = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      for (const raw of prose.match(/'(?:[^'\\]|\\.){10,300}'/g) ?? []) {
        const line = raw.slice(1, -1)
        if (!/\bthe lead('|’)?s?\b/i.test(line)) continue
        /* The one place naming them is right: a participant being told whose framing this is. */
        const at = prose.indexOf(raw)
        const before = prose.slice(Math.max(0, at - 260), at)
        if (/isTheLead \?|isLead \?|: '|\? '/.test(before)) continue
        offenders.push(line.slice(0, 70))
      }
    }
    expect(offenders).toEqual([])
  })
})
