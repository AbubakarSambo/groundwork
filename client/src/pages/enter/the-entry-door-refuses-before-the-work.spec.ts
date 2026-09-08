import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A DOOR THAT REFUSES YOU AT THE END IS WORSE THAN ONE THAT REFUSES YOU AT THE START.
 *
 * `/start` finishes at `POST /entry/commit`, which asks the same `mayOpen` rule the create page asks
 * and throws a Forbidden for anybody who is not allowed to open a check-in. Nothing said so on the
 * way in. So a member of an organisation set to NAMED_LEADS, or a guest from another company, could
 * describe their situation, answer every setup question, give a full check-in, read their report -
 * and be refused at the save, with all of it discarded.
 *
 * The create page had this bug and it was fixed: "a member used to fill in eight steps to be told
 * no". This is the same bug at the other door, and it costs more, because the work between the door
 * and the refusal is a person's own account rather than a form.
 *
 * WHAT MUST NOT REGRESS ALONGSIDE IT: an anonymous visitor has no user, `mayOpenCheckIns` is
 * undefined, `undefined !== false` is true, and they walk straight in. That is the entire purpose of
 * this door - somebody with no account becomes the admin of their own organisation.
 */
const APP = readFileSync(join(__dirname, '..', '..', 'App.tsx'), 'utf8')
  /* A guard a comment satisfies is not a guard, and the note beside this route says all of it. */
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('the entry door refuses before the work, not after it', () => {
  it('guards /start with the rule the commit will apply', () => {
    expect(APP).toMatch(/path="\/start" element=\{<MayOpenCheckIns><EntryChatPage \/><\/MayOpenCheckIns>\}/)
  })

  it('and it is the same guard the create page uses, not a second copy of the rule', () => {
    /* Two copies of a permission rule in two languages is how the rail came to show a button that
       the server then refused. The component reads one field the server computed. */
    expect(APP).toMatch(/function MayOpenCheckIns[\s\S]{0,200}user\?\.mayOpenCheckIns !== false/)
    expect(APP).toMatch(/path="\/grounds\/new"[\s\S]{0,120}<MayOpenCheckIns>/)
  })

  it('still lets a stranger with no account through, which is what this door is for', () => {
    /*
     * `!== false` rather than `=== true`, and the difference is the whole feature: an anonymous
     * visitor has no user object, so the field is undefined. Written as `=== true` this route would
     * refuse every first-time visitor, which is the one person it exists for.
     */
    expect(APP).not.toMatch(/user\?\.mayOpenCheckIns === true/)
  })
})
